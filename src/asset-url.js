import { INLINE_SHOWCASE_ASSET_URLS } from "./showcase-inline-assets.js";

const SHOWCASE_ASSET_FILES = Object.freeze({
  brigantine: "brigantine.gltf",
  cutter: "cutter.gltf",
  lighthouse: "lighthouse.gltf",
  "harbor-dock": "harbor-dock.gltf",
});

function createInlineShowcaseAssetUrl(assetName) {
  const inlineUrl = INLINE_SHOWCASE_ASSET_URLS[assetName];
  return inlineUrl ? new URL(inlineUrl) : null;
}

function getBrowserBaseUrl() {
  if (
    typeof document !== "undefined" &&
    typeof document.baseURI === "string" &&
    document.baseURI.length > 0
  ) {
    return document.baseURI;
  }
  if (
    typeof window !== "undefined" &&
    typeof window.location?.href === "string" &&
    window.location.href.length > 0
  ) {
    return window.location.href;
  }
  return null;
}

function normalizeAssetName(assetName) {
  return typeof assetName === "string" && assetName in SHOWCASE_ASSET_FILES
    ? assetName
    : "brigantine";
}

function parseResolveArgs(baseUrlOrAssetName, assetName) {
  if (
    typeof baseUrlOrAssetName === "string" &&
    baseUrlOrAssetName in SHOWCASE_ASSET_FILES &&
    typeof assetName === "undefined"
  ) {
    return {
      baseUrl: import.meta.url,
      assetName: baseUrlOrAssetName,
    };
  }

  return {
    baseUrl: baseUrlOrAssetName ?? import.meta.url,
    assetName: normalizeAssetName(assetName),
  };
}

export function resolveShowcaseAssetUrl(baseUrlOrAssetName, assetName) {
  const resolved = parseResolveArgs(baseUrlOrAssetName, assetName);
  const fileName = SHOWCASE_ASSET_FILES[resolved.assetName];

  try {
    return new URL(`../assets/${fileName}`, resolved.baseUrl);
  } catch {
    const browserBaseUrl = getBrowserBaseUrl();
    if (browserBaseUrl) {
      try {
        const normalizedBaseUrl = new URL(resolved.baseUrl, browserBaseUrl);
        return new URL(`../assets/${fileName}`, normalizedBaseUrl);
      } catch {
        const inlineAsset = createInlineShowcaseAssetUrl(resolved.assetName);
        if (inlineAsset) {
          return inlineAsset;
        }
      }
    }

    const inlineAsset = createInlineShowcaseAssetUrl(resolved.assetName);
    if (inlineAsset) {
      return inlineAsset;
    }

    try {
      return new URL(`../assets/${fileName}`, import.meta.url);
    } catch {
      throw new Error(`Unable to resolve showcase asset URL for ${resolved.assetName}.`);
    }
  }
}

export function shouldUseInlineShowcaseFallback(url) {
  if (url && typeof url === "object" && url[showcaseAssetUrlMarker] === true) {
    return true;
  }

  const href = url instanceof URL ? url.href : String(url ?? "");
  return href.includes("/assets/brigantine.gltf");
}

export function resolveShowcaseAssetUrl(baseUrl = import.meta.url) {
  const directBaseUrl =
    baseUrl instanceof URL ? baseUrl : tryResolveUrl(baseUrl);
  if (directBaseUrl) {
    return markShowcaseAssetUrl(new URL(SHOWCASE_ASSET_PATH, directBaseUrl));
  }

  const browserBaseUrl = getBrowserBaseUrl();
  if (browserBaseUrl) {
    const browserResolvedBaseUrl = tryResolveUrl(baseUrl, browserBaseUrl);
    if (browserResolvedBaseUrl) {
      return markShowcaseAssetUrl(new URL(SHOWCASE_ASSET_PATH, browserResolvedBaseUrl));
    }
  }

  return markShowcaseAssetUrl(new URL(SHOWCASE_ASSET_PATH, "file:///"));
}
