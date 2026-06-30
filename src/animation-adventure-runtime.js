const STYLE_ID = "plasius-animation-adventure-style";
const DEFAULT_WIDTH = 960;
const DEFAULT_HEIGHT = 540;
const DEFAULT_CAMERA = Object.freeze({
  mode: "lagged-follow",
  cubicBezier: [0.22, 0.61, 0.36, 1],
  lagMs: 240,
  lookAheadMs: 320,
  offset: [-1.1, 2.4, 5.5],
});

function createPrng(seed) {
  let state = (Number.isInteger(seed) ? seed : 0x12_08_04) >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function between(random, min, max) {
  return min + (max - min) * random();
}

function createProp(id, kind, position) {
  return Object.freeze({
    id,
    kind,
    position: Object.freeze(position),
  });
}

export function createAnimationAdventureProps(layout = {}) {
  const random = createPrng(layout.seed);
  const props = [];
  const cropRows = 6;
  for (let index = 0; index < cropRows; index += 1) {
    props.push(createProp(`crop-row-${index}`, "crop-row", [2.4 + index * 0.42, 0, 0.6 + index * 0.22]));
  }

  for (let index = 0; index < 8; index += 1) {
    props.push(createProp(`fence-${index}`, "fence-segment", [-1.5 + index * 1.2, 0, -1.1 + between(random, -0.12, 0.12)]));
  }

  props.push(createProp("cart", "cart", [7.2, 0, -0.3]));
  props.push(createProp("crate-a", "crate", [6.4, 0, 0.42]));
  props.push(createProp("crate-b", "crate", [6.8, 0, 0.78]));

  for (let index = 0; index < 5; index += 1) {
    props.push(createProp(`small-tree-${index}`, "small-tree", [
      between(random, -2.8, 8.4),
      0,
      between(random, 2.8, 4.8),
    ]));
  }

  for (const [index, point] of (layout.route ?? []).entries()) {
    props.push(createProp(`path-marker-${index}`, "path-marker", point.position));
  }

  return Object.freeze(props);
}

function installStyle(document) {
  if (document.getElementById?.(STYLE_ID)) {
    return;
  }
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .plasius-animation-adventure {
      min-height: 100%;
      display: grid;
      place-items: stretch;
      background: #d8e8d0;
      overflow: hidden;
    }
    .plasius-animation-adventure__canvas {
      width: 100%;
      height: 100%;
      min-height: 420px;
      display: block;
    }
  `;
  document.head?.appendChild?.(style);
}

function resolveRoot(options) {
  if (options.root) {
    return options.root;
  }
  return globalThis.document?.body;
}

async function loadBinaryAsset(url, loader) {
  if (!url) {
    return null;
  }
  if (typeof loader === "function") {
    return loader(url);
  }
  if (typeof fetch !== "function") {
    return null;
  }
  const response = await fetch(String(url));
  if (!response.ok) {
    throw new Error(`Animation adventure asset failed to load: ${url}`);
  }
  return response.arrayBuffer();
}

export async function mountGpuAnimationAdventure(options = {}) {
  const root = resolveRoot(options);
  if (!root?.ownerDocument) {
    throw new Error("animation adventure requires a root element with an ownerDocument.");
  }
  const document = root.ownerDocument;
  const adventure = options.animationAdventure ?? {};
  installStyle(document);

  const previousHtml = root.innerHTML;
  root.innerHTML = "";
  root.classList?.add?.("plasius-animation-adventure");

  const canvas = document.createElement("canvas");
  canvas.className = "plasius-animation-adventure__canvas";
  canvas.width = options.width ?? DEFAULT_WIDTH;
  canvas.height = options.height ?? DEFAULT_HEIGHT;
  root.appendChild(canvas);

  const clips = [...(adventure.clips ?? adventure.clipRefs ?? [])];
  const [modelAsset, clipAssets, rendererModule] = await Promise.all([
    loadBinaryAsset(adventure.modelUrl, options.__modelAssetLoader),
    Promise.all(clips.map((clip) => loadBinaryAsset(clip.url ?? clip.clipUrl, options.__clipAssetLoader))),
    (typeof options.__rendererLoader === "function"
      ? options.__rendererLoader()
      : import("@plasius/gpu-renderer")),
  ]);

  if (typeof rendererModule.createAnimatedSceneRenderer !== "function") {
    throw new Error("renderer loader must provide createAnimatedSceneRenderer.");
  }

  const route = adventure.route ?? [];
  const props = adventure.generatedProps ?? createAnimationAdventureProps({
    ...(adventure.props ?? {}),
    route,
  });
  const renderer = rendererModule.createAnimatedSceneRenderer({
    canvas,
    route,
    beats: adventure.beats ?? [],
    props,
    camera: adventure.camera ?? DEFAULT_CAMERA,
    animationAdventure: adventure,
  });
  renderer.resize(canvas.width, canvas.height, 1);
  renderer.start();

  return {
    canvas,
    state: {
      demoMode: "animation-adventure",
      modelUrl: adventure.modelUrl,
      modelLoaded: modelAsset !== null,
      loadedClipCount: clipAssets.filter(Boolean).length,
      clipIds: clips.map((clip) => clip.id),
      propSeed: adventure.props?.seed,
      propCount: props.length,
      rendererSnapshot: renderer.getSnapshot(),
    },
    renderer,
    props,
    destroy() {
      renderer.destroy();
      root.classList?.remove?.("plasius-animation-adventure");
      root.innerHTML = previousHtml;
    },
  };
}
