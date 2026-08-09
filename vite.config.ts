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
