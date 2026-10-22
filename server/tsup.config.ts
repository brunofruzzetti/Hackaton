import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node20",
  outDir: "dist",
  clean: true,
  splitting: false,
  sourcemap: true,
  // @junta/shared se publica como TypeScript fuente: hay que bundlearlo para Node.
  noExternal: ["@junta/shared"],
});
