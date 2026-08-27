import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import packageJson from './package.json'

const removeCrossoriginPlugin = () => ({
  name: 'remove-crossorigin',
  transformIndexHtml(html) {
    return html.replace(/crossorigin/g, '');
  }
});

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version)
  },
  plugins: [
    react(),
    removeCrossoriginPlugin(),
    VitePWA({
      disable: false,
      registerType: 'autoUpdate',
      includeAssets: ['logo.svg', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'RGUKT CONNECT',
        short_name: 'RGUKT',
        description: 'RGUKT Student Connect Platform',
        theme_color: '#4f46e5',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,jsx}'],
        globIgnores: ['data/puc_results.json'],
        maximumFileSizeToCacheInBytes: 5000000,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
            }
          }
        ]
      }
    })
  ],
  server: {
    open: false,
    headers: {
      'Cross-Origin-Opener-Policy': 'unsafe-none',
      'Cross-Origin-Embedder-Policy': 'unsafe-none'
    }
  },
  base: './',
  build: {
    target: 'es2015',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          'vendor-capacitor': ['@capacitor/core', '@capacitor/app', '@capacitor/filesystem'], // Separate native core
          'vendor-utils': ['crypto-js', 'date-fns', 'ua-parser-js'],
          'vendor-ui-libs': ['lucide-react'],
          'vendor-heavy-ml': ['face-api.js'], // Isolate huge ML library
          'vendor-heavy-export': ['html2canvas', 'jspdf', 'html2pdf.js'] // Separate Export libs
        }
      }
    },
    chunkSizeWarningLimit: 3000,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  }
})
