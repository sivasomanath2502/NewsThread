import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        // Proxy /api/article → Express server (fetches full article server-side, no CORS)
        '/api/article': {
          target: 'http://localhost:8787',
          changeOrigin: true,
        },
        // Proxy /api/news → Express server (which caches + hides the API key)
        '/api/news': {
          target: 'http://localhost:8787',
          changeOrigin: true,
        },
        // Proxy /api/ollama → local Ollama LLM (for AI recap)
        '/api/ollama': {
          target: 'http://127.0.0.1:11434',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/ollama/, ''),
        },
      },
    },
  }
})
