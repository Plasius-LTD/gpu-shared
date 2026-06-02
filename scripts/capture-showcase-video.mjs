#!/usr/bin/env node
import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

const DEFAULT_URL =
  "http://127.0.0.1:8765/gpu-shared/demo/?capture=1&quality=ultra&resolution=720p&timeOfDay=cycle&renderScale=2";
const DEFAULT_FPS = 60;
const DEFAULT_FRAMES = 600;
const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 720;
const CLEANUP_RETRY_DELAYS_MS = Object.freeze([80, 160, 320, 640, 1000]);
const HOME_DIR = process.env.HOME ?? "";
const CHROME_CANDIDATES = Object.freeze([
  path.join(
    HOME_DIR,
    "Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
  ),
  path.join(
    HOME_DIR,
    "Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell"
  ),
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
]);

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }
    const [rawKey, inlineValue] = token.slice(2).split("=", 2);
    const key = rawKey.replace(/-([a-z])/gu, (_, letter) => letter.toUpperCase());
    if (inlineValue !== undefined) {
      args[key] = inlineValue;
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      args[key] = next;
      index += 1;
    } else {
      args[key] = "true";
    }
  }
  return args;
}

function printHelp() {
  console.log(`Usage: npm run capture:video -- [options]

Options:
  --url <url>             Demo URL to capture. Defaults to the local 720p ultra capture route.
  --output <path>         Output video path. Defaults to /private/tmp/plasius-gpu-captures/*.mp4.
  --frames <count>        Number of simulation frames to render. Default: ${DEFAULT_FRAMES}.
  --duration <seconds>    Alternative to --frames; frames = duration * fps.
  --fps <number>          Output video frame rate and simulation step. Default: ${DEFAULT_FPS}.
  --width <px>            Browser viewport width. Default: ${DEFAULT_WIDTH}.
  --height <px>           Browser viewport height. Default: ${DEFAULT_HEIGHT}.
  --format <mp4|mpeg>     Encoder format. Default: mp4.
  --chrome-path <path>    Chrome/Chromium executable path.
  --frames-dir <path>     Directory for temporary PNG frames.
  --keep-frames           Keep PNG frames after encoding.
`);
}

function readPositiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : fallback;
}

function readPositiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function timestampSlug() {
  return new Date().toISOString().replace(/[:.]/gu, "-");
}

function resolveChromePaths(value) {
  if (value) {
    if (existsSync(value)) {
      return [value];
    }
    throw new Error(`Chrome or Chromium was not found at ${value}.`);
  }
  const candidates = CHROME_CANDIDATES.filter((entry, index, list) => {
    return entry && list.indexOf(entry) === index && existsSync(entry);
  });
  if (candidates.length === 0) {
    throw new Error("Chrome or Chromium was not found. Pass --chrome-path to a browser executable.");
  }
  return candidates;
}

function withCaptureParams(rawUrl) {
  const url = new URL(rawUrl);
  url.searchParams.set("capture", "1");
  url.searchParams.set("quality", url.searchParams.get("quality") ?? "ultra");
  url.searchParams.set("resolution", url.searchParams.get("resolution") ?? "720p");
  url.searchParams.set("renderScale", url.searchParams.get("renderScale") ?? "2");
  url.searchParams.set("frameExport", "1");
  return url.href;
}

function requestJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const request = http.request(url, options, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf8");
        if ((response.statusCode ?? 500) >= 400) {
          reject(new Error(`HTTP ${response.statusCode}: ${body}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });
    request.on("error", reject);
    request.end();
  });
}

async function findFreePort() {
  const server = net.createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  await new Promise((resolve) => server.close(resolve));
  return address.port;
}

async function waitForBrowser(port, timeoutMs = 12000) {
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started < timeoutMs) {
    try {
      return await requestJson(`http://127.0.0.1:${port}/json/version`);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`Chrome did not expose a debugging endpoint: ${lastError?.message ?? "timeout"}`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForProcessExit(child, timeoutMs = 5000) {
  if (!child || child.exitCode !== null || child.signalCode !== null) {
    return true;
  }

  const timeout = delay(timeoutMs).then(() => false);
  const exited = once(child, "exit").then(() => true);
  return Promise.race([exited, timeout]);
}

async function stopChrome(chrome) {
  if (!chrome) {
    return;
  }

  if (chrome.exitCode === null && chrome.signalCode === null) {
    chrome.kill();
  }

  const exited = await waitForProcessExit(chrome, 5000);
  if (!exited && chrome.exitCode === null && chrome.signalCode === null) {
    chrome.kill("SIGKILL");
    await waitForProcessExit(chrome, 2000);
  }
}

async function removeDirectoryWithRetries(directory) {
  let lastError = null;
  for (let attempt = 0; attempt <= CLEANUP_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      await rm(directory, { recursive: true, force: true });
      return;
    } catch (error) {
      if (error?.code === "ENOENT") {
        return;
      }
      lastError = error;
      if (attempt === CLEANUP_RETRY_DELAYS_MS.length) {
        break;
      }
      await delay(CLEANUP_RETRY_DELAYS_MS[attempt]);
    }
  }

  throw lastError;
}

async function cleanupUserDataDir(directory) {
  try {
    await removeDirectoryWithRetries(directory);
  } catch (error) {
    console.warn(
      `Warning: could not remove temporary Chrome profile ${directory}: ${error.message}`
    );
  }
}

async function launchChrome({ chromePath, port, width, height }) {
  const userDataDir = await mkdtemp(path.join(tmpdir(), "plasius-gpu-chrome-"));
  let stderr = "";
  const chrome = spawn(
    chromePath,
    [
      "--headless=new",
      `--remote-debugging-address=127.0.0.1`,
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
      `--window-size=${width},${height}`,
      "--hide-scrollbars",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--disable-dev-shm-usage",
      "--no-first-run",
      "--no-default-browser-check",
      "--autoplay-policy=no-user-gesture-required",
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] }
  );
  chrome.stderr.on("data", (chunk) => {
    stderr += String(chunk);
  });

  try {
    const version = await waitForBrowser(port);
    return { chrome, userDataDir, version };
  } catch (error) {
    await stopChrome(chrome);
    await cleanupUserDataDir(userDataDir);
    const stderrSummary = stderr.trim().split(/\r?\n/u).slice(-6).join("\n");
    throw new Error(
      `${chromePath} did not expose a debugging endpoint: ${error.message}${
        stderrSummary ? `\n${stderrSummary}` : ""
      }`,
      { cause: error }
    );
  }
}

class CdpClient {
  constructor(webSocketUrl) {
    this.webSocketUrl = webSocketUrl;
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];
  }

  async connect() {
    this.socket = new WebSocket(this.webSocketUrl);
    this.socket.addEventListener("message", (event) => this.handleMessage(event.data));
    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
  }

  handleMessage(data) {
    const message = JSON.parse(String(data));
    if (message.id && this.pending.has(message.id)) {
      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) {
        reject(new Error(`${message.error.message}: ${message.error.data ?? ""}`));
      } else {
        resolve(message.result ?? {});
      }
      return;
    }
    this.events.push(message);
  }

  send(method, params = {}, sessionId = undefined) {
    const id = this.nextId;
    this.nextId += 1;
    const payload = { id, method, params };
    if (sessionId) {
      payload.sessionId = sessionId;
    }
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify(payload));
    });
  }

  close() {
    this.socket?.close();
  }
}

function formatRuntimeException(result) {
  if (!result.exceptionDetails) {
    return null;
  }
  return (
    result.exceptionDetails.exception?.description ??
    result.exceptionDetails.text ??
    "Runtime evaluation failed"
  );
}

async function evaluate(client, sessionId, expression, options = {}) {
  const result = await client.send(
    "Runtime.evaluate",
    {
      expression,
      awaitPromise: options.awaitPromise === true,
      returnByValue: true,
      userGesture: true,
    },
    sessionId
  );
  const exception = formatRuntimeException(result);
  if (exception) {
    throw new Error(exception);
  }
  return result.result?.value;
}

async function collectPageDiagnostics(client, sessionId) {
  try {
    return await evaluate(
      client,
      sessionId,
      `JSON.stringify({
        href: window.location.href,
        title: document.title,
        readyState: document.readyState,
        bodyText: document.body?.innerText?.slice(0, 500) ?? "",
        canvasExists: Boolean(document.querySelector("#demoCanvas")),
        captureHookExists: Boolean(window.__plasiusCaptureFrame),
      })`
    );
  } catch (error) {
    return JSON.stringify({ diagnosticError: error.message });
  }
}

function collectRuntimeDiagnostics(client) {
  return client.events
    .filter((event) =>
      event.method === "Runtime.exceptionThrown" ||
      event.method === "Runtime.consoleAPICalled" ||
      event.method === "Log.entryAdded" ||
      event.method === "Network.loadingFailed"
    )
    .slice(-12)
    .map((event) => {
      if (event.method === "Runtime.exceptionThrown") {
        return event.params?.exceptionDetails?.exception?.description ??
          event.params?.exceptionDetails?.text ??
          "Runtime exception";
      }
      if (event.method === "Runtime.consoleAPICalled") {
        const args = event.params?.args ?? [];
        return args
          .map((entry) => entry.value ?? entry.description ?? entry.type ?? "")
          .filter(Boolean)
          .join(" ");
      }
      if (event.method === "Log.entryAdded") {
        const entry = event.params?.entry;
        return `${entry?.level ?? "log"}: ${entry?.text ?? ""}`;
      }
      if (event.method === "Network.loadingFailed") {
        return `${event.params?.errorText ?? "Network loading failed"}: ${event.params?.requestId ?? ""}`;
      }
      return event.method;
    })
    .filter(Boolean);
}

async function waitForPageReady(client, sessionId) {
  const started = Date.now();
  while (Date.now() - started < 30000) {
    const ready = await evaluate(
      client,
      sessionId,
      `Boolean(window.__plasiusCaptureFrame && document.querySelector("#demoCanvas"))`
    );
    if (ready) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const pageDiagnostics = await collectPageDiagnostics(client, sessionId);
  const runtimeDiagnostics = collectRuntimeDiagnostics(client);
  throw new Error(
    `Timed out waiting for the showcase capture hook.\nPage diagnostics: ${pageDiagnostics}${
      runtimeDiagnostics.length > 0
        ? `\nRecent browser diagnostics:\n${runtimeDiagnostics.join("\n")}`
        : ""
    }`
  );
}

async function captureFrames({ client, sessionId, framesDir, frames, stepMs }) {
  await mkdir(framesDir, { recursive: true });
  const padWidth = Math.max(6, String(frames).length);

  for (let index = 0; index < frames; index += 1) {
    await evaluate(
      client,
      sessionId,
      `window.__plasiusCaptureFrame({ stepMs: ${index === 0 ? 0 : stepMs} })`
    );
    const dataUrl = await evaluate(
      client,
      sessionId,
      `document.querySelector("#demoCanvas").toDataURL("image/png")`
    );
    const base64 = String(dataUrl).replace(/^data:image\/png;base64,/u, "");
    const filename = `frame-${String(index).padStart(padWidth, "0")}.png`;
    await writeFile(path.join(framesDir, filename), Buffer.from(base64, "base64"));

    if (index === 0 || (index + 1) % 30 === 0 || index + 1 === frames) {
      console.log(`Captured frame ${index + 1}/${frames}`);
    }
  }

  return path.join(framesDir, `frame-%0${padWidth}d.png`);
}

async function runFfmpeg({ pattern, fps, format, output }) {
  await mkdir(path.dirname(output), { recursive: true });
  const args =
    format === "mpeg"
      ? [
          "-y",
          "-framerate",
          String(fps),
          "-i",
          pattern,
          "-c:v",
          "mpeg2video",
          "-q:v",
          "2",
          "-r",
          String(fps),
          output,
        ]
      : [
          "-y",
          "-framerate",
          String(fps),
          "-i",
          pattern,
          "-c:v",
          "libx264",
          "-preset",
          "slow",
          "-crf",
          "18",
          "-pix_fmt",
          "yuv420p",
          "-r",
          String(fps),
          output,
        ];

  await new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
    });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    printHelp();
    return;
  }

  if (typeof WebSocket !== "function") {
    throw new Error("This script requires Node.js with the global WebSocket API.");
  }

  const fps = readPositiveNumber(args.fps, DEFAULT_FPS);
  const frames = args.duration
    ? Math.max(1, Math.round(readPositiveNumber(args.duration, 1) * fps))
    : readPositiveInteger(args.frames, DEFAULT_FRAMES);
  const width = readPositiveInteger(args.width, DEFAULT_WIDTH);
  const height = readPositiveInteger(args.height, DEFAULT_HEIGHT);
  const format = String(args.format ?? "mp4").toLowerCase() === "mpeg" ? "mpeg" : "mp4";
  const extension = format === "mpeg" ? "mpg" : "mp4";
  const output = path.resolve(
    args.output ??
      path.join(tmpdir(), "plasius-gpu-captures", `gpu-showcase-${timestampSlug()}.${extension}`)
  );
  const framesDir = path.resolve(
    args.framesDir ??
      path.join(tmpdir(), "plasius-gpu-captures", `frames-${timestampSlug()}`)
  );
  const chromePaths = resolveChromePaths(args.chromePath);
  const url = withCaptureParams(args.url ?? DEFAULT_URL);
  const stepMs = 1000 / fps;
  let chrome = null;
  let client = null;
  let userDataDir = null;

  try {
    let launch = null;
    const launchErrors = [];
    for (const chromePath of chromePaths) {
      try {
        const port = await findFreePort();
        launch = await launchChrome({ chromePath, port, width, height });
        console.log(`Using browser: ${chromePath}`);
        break;
      } catch (error) {
        launchErrors.push(error.message);
      }
    }

    if (!launch) {
      throw new Error(`Could not launch a capturable Chromium browser.\n${launchErrors.join("\n\n")}`);
    }

    chrome = launch.chrome;
    userDataDir = launch.userDataDir;
    client = new CdpClient(launch.version.webSocketDebuggerUrl);
    await client.connect();
    const { targetId } = await client.send("Target.createTarget", {
      url: "about:blank",
    });
    const { sessionId } = await client.send("Target.attachToTarget", {
      targetId,
      flatten: true,
    });
    await client.send("Page.enable", {}, sessionId);
    await client.send("Network.enable", {}, sessionId);
    await client.send("Log.enable", {}, sessionId);
    await client.send("Runtime.enable", {}, sessionId);
    await client.send(
      "Emulation.setDeviceMetricsOverride",
      {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: false,
        screenWidth: width,
        screenHeight: height,
      },
      sessionId
    );
    const navigation = await client.send("Page.navigate", { url }, sessionId);
    if (navigation.errorText) {
      throw new Error(`Could not navigate to ${url}: ${navigation.errorText}`);
    }
    await waitForPageReady(client, sessionId);

    console.log(`Capturing ${frames} frames at ${fps} FPS from ${url}`);
    const pattern = await captureFrames({ client, sessionId, framesDir, frames, stepMs });
    console.log(`Encoding ${output}`);
    await runFfmpeg({ pattern, fps, format, output });
    console.log(`Video written: ${output}`);

    if (!args.keepFrames) {
      await rm(framesDir, { recursive: true, force: true });
    } else {
      console.log(`Frames kept: ${framesDir}`);
    }
  } finally {
    client?.close();
    await stopChrome(chrome);
    if (userDataDir) {
      await cleanupUserDataDir(userDataDir);
    }
  }
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
