import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// WICHTIG für GitHub Pages:
// "base" muss exakt "/<dein-repo-name>/" sein, z. B. "/summersweat/".
// Wird die Seite über eine eigene Domain oder als User-Page (dein-name.github.io) ausgeliefert,
// auf base: "/" stellen.
export default defineConfig({
  plugins: [react()],
  base: "/summersweat/",
});
