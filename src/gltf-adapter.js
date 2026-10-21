import { fetchResource, sha256Hex, defaultSleep } from '@plasius/gpu-model-runtime';
import { importGltfToGpuModelDocument, DEFAULT_GLTF_RESOURCE_IMPORT_LIMITS } from '@plasius/gpu-model-gltf';

// Runtime owns bounded acquisition; the format package owns validation and
// normalization. This bridge deliberately registers no entrypoint-only cache.
export class GltfAdapterLoadError extends Error {
  constructor(code) {
    super(`glTF adapter loading failed: ${code}.`);
    this.name = 'GltfAdapterLoadError';
    this.code = code;
  }
}

export async function loadAdapterGltfModel(url, options, project, compatible, unavailable) {
  const limit = (key, fallback) => {
    const value = options[key] ?? fallback;
    if (!Number.isSafeInteger(value) || value < 1 || value > fallback) {
      throw new GltfAdapterLoadError('invalid-options');
    }
    return value;
  };
  const timeoutMs = limit('timeoutMs', DEFAULT_GLTF_RESOURCE_IMPORT_LIMITS.timeoutMs);
  const maxInputBytes = limit('maxInputBytes', DEFAULT_GLTF_RESOURCE_IMPORT_LIMITS.maxInputBytes);
  options.signal?.throwIfAborted();
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, timeoutMs);
  let rejectStopped;
  const stopped = new Promise((_, reject) => { rejectStopped = reject; });
  const onAbort = () => rejectStopped(new GltfAdapterLoadError('aborted-or-timeout'));
  controller.signal.addEventListener('abort', onAbort, { once: true });
  const check = () => { if (controller.signal.aborted) throw new GltfAdapterLoadError('aborted-or-timeout'); };
  let baseUrl = url;
  let acquired = 0;
  const fetchOne = async (requestUrl, maxBytes, signal) => {
    check();
    const digest = options.integrity?.[String(requestUrl)];
    if (options.integrity && !digest) throw new GltfAdapterLoadError('missing-integrity-manifest-entry');
    maxBytes = Math.min(maxBytes, DEFAULT_GLTF_RESOURCE_IMPORT_LIMITS.maxAggregateBytes - acquired);
    if (maxBytes < 1) throw new GltfAdapterLoadError('input-resource-limit');
    const result = await fetchResource(String(requestUrl), {
      fetch: async (input, init) => {
        const response = await fetch(input, { ...init, ...(digest ? { integrity: digest } : {}) });
        if (String(requestUrl) === String(url) && response.url) baseUrl = new URL(response.url);
        return response;
      },
      hashBytes: sha256Hex, sleep: defaultSleep,
      policy: { maxBytes, maxAttempts: 1, timeoutMs },
      resolveOptions: { signal, maxBytes },
    });
    acquired += result.bytes.byteLength;
    return result;
  };
  // Compatibility projection asks for multiple buffers/images; serialize their
  // acquisition so concurrent requests cannot each spend the remaining budget.
  let pending = Promise.resolve();
  const acquire = (...args) => {
    const next = pending.then(() => fetchOne(...args));
    pending = next.catch(() => {});
    return next;
  };
  const projectionOptions = { ...options, signal: controller.signal,
    __imageBudget: { remaining: DEFAULT_GLTF_RESOURCE_IMPORT_LIMITS.maxAggregateDecodedImageBytes,
      maxDimension: DEFAULT_GLTF_RESOURCE_IMPORT_LIMITS.maxImageDimension } };
  const work = async () => {
    let entry;
    const resourceFetch = async target => {
        const value = String(target) === String(baseUrl) && entry ? entry
          : await acquire(target, entry ? DEFAULT_GLTF_RESOURCE_IMPORT_LIMITS.maxResourceBytes : maxInputBytes, controller.signal);
        const response = new Response(value.bytes, { headers: value.contentType ? { 'content-type': value.contentType } : {} });
        Object.defineProperty(response, 'url', { value: String(target) });
        return response;
      };
    try { entry = await acquire(url, maxInputBytes, controller.signal); }
    catch (error) {
      check();
      if (error instanceof GltfAdapterLoadError) throw error;
      if (error?.name === 'ModelResourceTooLargeError') throw new GltfAdapterLoadError('input-resource-limit');
      // Only actual entrypoint network/status failures qualify for the old
      // approved showcase network fallback, never parse/validation failures.
      if (!options.integrity && unavailable) {
        const output = await unavailable({ ...projectionOptions, __resourceFetch: resourceFetch });
        check();
        return Object.freeze({ ...output, importProfile: 'legacy', compatibilityReason: 'showcase-network-unavailable' });
      }
      throw new GltfAdapterLoadError('entry-acquisition-failed');
    }
    check();
    const fallback = async () => {
      // Reuse the exact admitted entry bytes. Compatibility resources still pass
      // through the same bounded runtime acquisition, SRI and total deadline.
      const output = await compatible(baseUrl, { ...projectionOptions, __resourceFetch: resourceFetch });
      check();
      return Object.freeze({ ...output, importProfile: 'legacy', compatibilityReason: 'unsupported-gltf-feature' });
    };
    let imported;
    try { imported = await importGltfToGpuModelDocument(entry.bytes, {
      conversionEnabled: true, signal: controller.signal, contentType: entry.contentType,
      resourceResolver: {
        async resolve(reference, request) {
          const path = typeof reference === 'string' ? reference : reference.path;
          const target = new URL(path, baseUrl);
          const got = await acquire(target, request.maxBytes, request.signal);
          return { ...got, path, contentHash: await sha256Hex(got.bytes) };
        },
      },
    }); }
    catch (error) {
      check();
      if (error?.code === 'unsupported-gltf-feature') return fallback();
      throw error;
    }
    check();
    // Source-normalized GLB retains authored basis/origin. Canonical geometry
    // intentionally has a different basis and floor-centred normalization root.
    const output = await project(await imported.normalizedGlb.payload.arrayBuffer(), baseUrl, projectionOptions);
    check();
    return Object.freeze({ ...output, importProfile: imported.profile });
  };
  try {
    return await Promise.race([work(), stopped]);
  } catch (error) {
    check();
    if (error instanceof GltfAdapterLoadError) throw error;
    // Format errors are bounded, payload-free categories from the adapter.
    if (typeof error?.code === 'string' && /^[a-z-]{1,64}$/u.test(error.code)) throw new GltfAdapterLoadError(error.code);
    throw new GltfAdapterLoadError('projection-failed');
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
    controller.signal.removeEventListener('abort', onAbort);
    controller.abort();
  }
}
