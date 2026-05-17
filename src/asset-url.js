const SHOWCASE_ASSET_PATH = "../assets/brigantine.gltf";
const showcaseAssetUrlMarker = Symbol.for("@plasius/gpu-shared.showcaseAssetUrl");

function markShowcaseAssetUrl(url) {
  Object.defineProperty(url, showcaseAssetUrlMarker, {
    configurable: false,
    enumerable: false,
    value: true,
    writable: false,
  });
  return url;
}

function getBrowserBaseUrl() {
  if (typeof document !== "undefined" && typeof document.baseURI === "string" && document.baseURI.length > 0) {
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

function tryResolveUrl(url, baseUrl) {
  try {
    return baseUrl === undefined ? new URL(url) : new URL(url, baseUrl);
  } catch {
    return null;
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
