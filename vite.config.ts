import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// In dev, API calls go to the same origin and Vite proxies them to the backend,
// so the browser never needs CORS. Set VITE_API_URL to call the backend directly instead.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const target = env.BACKEND_URL || "http://localhost:3000";
  const proxy = Object.fromEntries(["/tools", "/admin", "/voice", "/health"].map((p) => [p, { target, changeOrigin: true }]));
  return {
    plugins: [react()],
    // The ElevenLabs SDK (~660 kB) is its own lazy chunk, loaded only when a call starts.
    build: { chunkSizeWarningLimit: 700 },
    server: { port: 5173, strictPort: true, proxy },
    preview: { port: 4173, strictPort: true, proxy },
  };
});
