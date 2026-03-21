import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.js"],
  sourcemap: true,
  clean: true,
  format: ["esm", "cjs"],
  target: "es2022",
  noExternal: [
    /^@plasius\/gpu-cloth$/,
    /^@plasius\/gpu-debug$/,
    /^@plasius\/gpu-fluid$/,
    /^@plasius\/gpu-lighting$/,
    /^@plasius\/gpu-performance$/,
    /^@plasius\/gpu-physics\/browser$/,
  ],
});
