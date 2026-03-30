import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 8080,
    proxy: {
      // Dev mode: bypass Dapr, hit llm-proxy directly
      "/v1.0/invoke/llm-proxy/method": {
        target: "http://localhost:5100",
        changeOrigin: true,
        rewrite: (path) => path.replace("/v1.0/invoke/llm-proxy/method", ""),
      },
      // Dev mode: bypass Dapr, hit tool-service directly
      "/v1.0/invoke/tool-service/method": {
        target: "http://localhost:3100",
        changeOrigin: true,
        rewrite: (path) => path.replace("/v1.0/invoke/tool-service/method", ""),
      },
      // Dev mode: state store via Dapr sidecar
      "/v1.0/state": {
        target: "http://localhost:3500",
        changeOrigin: true,
      },
    },
  },
})
