import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Relative asset paths so the same build works on any host:
  // GitHub Pages (served under /essora-co/) AND Vercel (served at the root).
  base: "./",
  plugins: [react()],
});
