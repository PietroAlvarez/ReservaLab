import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const suiteRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  server: { port: 5174 },
  build: {
    rollupOptions: {
      input: {
        main: resolve(suiteRoot, "index.html"),
        reservations: resolve(suiteRoot, "reservas/index.html"),
      },
    },
  },
});
