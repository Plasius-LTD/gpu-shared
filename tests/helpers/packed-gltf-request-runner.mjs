import { createRequire } from "node:module";
import { loadGltfModel } from "@plasius/gpu-shared";
import { registerGltfRequestContract } from "./request-contract.mjs";

registerGltfRequestContract("packed ESM export", loadGltfModel);
registerGltfRequestContract("packed CJS export", createRequire(import.meta.url)("@plasius/gpu-shared").loadGltfModel);

import { registerAdapterContract } from "./adapter-contract.mjs";
registerAdapterContract("packed ESM export", loadGltfModel);
registerAdapterContract("packed CJS export", createRequire(import.meta.url)("@plasius/gpu-shared").loadGltfModel);
