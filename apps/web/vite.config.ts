import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api-proxy/reqres': {
        target: 'https://reqres.in',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-proxy\/reqres/, ''),
      },
      '/api-proxy/dummyjson': {
        target: 'https://dummyjson.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-proxy\/dummyjson/, ''),
      },
      '/api-proxy/jsonplaceholder': {
        target: 'https://jsonplaceholder.typicode.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-proxy\/jsonplaceholder/, ''),
      },
    },
  },
})
