import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Served from https://<user>.github.io/essora-co/ on GitHub Pages,
  // so assets must be looked up under that sub-path.
  base: "/essora-co/",
  plugins: [react()],
});
