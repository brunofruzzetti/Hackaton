import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const serverUrl = process.env.SERVER_URL ?? "http://localhost:3001";

export default defineConfig({
  envDir: "..",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@shared": fileURLToPath(new URL("../shared/src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: serverUrl,
        changeOrigin: true,
      },
      "/ws": {
        target: serverUrl,
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
