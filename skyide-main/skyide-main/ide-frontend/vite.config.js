import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const devProxyTarget = process.env.VITE_DEV_PROXY_TARGET || 'http://127.0.0.1:5055'

export default defineConfig({
  plugins: [
    react(),

    // Make /blockmirror load the standalone HTML page (public/blockmirror.html)
    // This avoids React Router handling /blockmirror and logging "No routes matched"
    {
      name: 'blockmirror-rewrite',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url || ''

          // Preserve querystrings
          if (url === '/blockmirror' || url.startsWith('/blockmirror?')) {
            req.url = '/blockmirror.html' + (url.includes('?') ? url.slice(url.indexOf('?')) : '')
          }

          next()
        })
      }
    }
  ],
  server: {
    proxy: {
      '/api': {
        target: devProxyTarget,
        changeOrigin: true
      },
      '/health': {
        target: devProxyTarget,
        changeOrigin: true
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@context': path.resolve(__dirname, './src/context'),
      '@styles': path.resolve(__dirname, './src/styles'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@assets': path.resolve(__dirname, './src/assets')
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '/*.d.ts',
        '/*.config.js',
        'dist/'
      ]
    }
  }
})
