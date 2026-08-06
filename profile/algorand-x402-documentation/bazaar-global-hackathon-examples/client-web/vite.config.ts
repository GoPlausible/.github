import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The dev server proxies the paid route to the local server example, so the
// browser talks same-origin — no CORS setup needed on the server.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/my-api": "http://localhost:4021",
    },
  },
});
