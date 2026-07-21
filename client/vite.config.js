import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    allowedHosts: true,
    // Proxies /api server-to-server so the browser only ever talks to one
    // origin. Without this, the frontend and backend sit on two unrelated
    // domains (e.g. two separate tunnels in this dev setup), and the CSRF
    // double-submit cookie (server/api/axios.js reads it via document.cookie)
    // can never be read cross-domain — document.cookie is same-origin only,
    // always, in every browser. Proxying makes Set-Cookie responses land on
    // the page's own origin instead.
    proxy: {
      '/api': {
        target: 'http://localhost:5050',
        changeOrigin: true,
      },
    },
  },
})
