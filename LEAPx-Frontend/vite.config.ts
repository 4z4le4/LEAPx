import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'LEAPx',
        short_name: 'LEAPx',
        description:
          'ยกระดับการเรียนรู้นอกห้องเรียนด้วยระบบเข้ากิจกรรมเพื่อเพิ่มสกิลสำหรับนักศึกษา',
        theme_color: '#ffffff',
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
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: [],
        runtimeCaching: [],
        cleanupOutdatedCaches: true
      }
    })
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },

  /**
   * dev server (npm run dev)
   */
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },

  /**
   * production preview (npm run preview)
   */
  preview: {
    host: true,
    port: 5173,
    allowedHosts: [
      'leapx.eng.cmu.ac.th'
    ]
  }
})
