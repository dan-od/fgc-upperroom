// CI/CD Deploy Test - March 5 2026
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/fgc-testing/',
  build: {
    modulePreload: {
      polyfill: false
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (
            id.includes('/react-dom/') ||
            id.includes('/scheduler/')
          ) {
            return 'vendor-react-dom'
          }

          if (
            id.includes('/react-router-dom/') ||
            id.includes('/react-router/') ||
            id.includes('/@remix-run/router/')
          ) {
            return 'vendor-router'
          }

          if (id.includes('/react/')) {
            return 'vendor-react'
          }

        }
      }
    }
  },
  server: {
    port: 3000,
    open: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/fgc-testing/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/bot': {
        target: 'http://localhost:4100',
        changeOrigin: true
      },
      '/attendance': {
        target: 'http://localhost:4201',
        changeOrigin: true
      }
    }
  }
})
