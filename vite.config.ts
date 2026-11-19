import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

declare const process: { env: Record<string, string | undefined> }

// Base configurable : '/LoreWriter/' en déploiement GitHub Pages (project site), '/' en local.
const base = process.env.LOREWRITER_BASE ?? '/'

export default defineConfig({
  base,
  server: {
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'LoreWriter',
        short_name: 'LoreWriter',
        description: 'Atelier de storytelling : personnages, relations, dialogues, roman, recherche et synchro cloud.',
        lang: 'fr',
        theme_color: '#f6f0e4',
        background_color: '#f6f0e4',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallback: 'index.html',
        // Mise à jour auto de la PWA (#7) : le nouveau SW s'active immédiatement
        // (skipWaiting) et prend le contrôle des pages (clientsClaim) → le code
        // client (autoUpdate) recharge la page sur l'événement 'activated'.
        skipWaiting: true,
        clientsClaim: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
