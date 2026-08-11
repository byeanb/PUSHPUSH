import { reactRouter } from "@react-router/dev/vite"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [
    tailwindcss(),

    VitePWA({
      strategies: "injectManifest",

      srcDir: "pwa",
      filename: "sw.js",

      injectManifest: {
        injectionPoint: undefined,
      },

      devOptions: {
        enabled: true,
        type: "module",
      },

      manifest: {
        name: "PWA Push Test",
        short_name: "Push Test",
        description: "PWA Web Push Notification Test",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#ffffff",

        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),

    reactRouter(),
  ],

  resolve: {
    tsconfigPaths: true,
  },

  server: {
    port: 3000,
  },
})
