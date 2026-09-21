import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: { host: true },
  input: {
    main: resolve(import.meta.dirname, "index.html"),
    product: resolve(import.meta.dirname, "product.html"),
  },
});
