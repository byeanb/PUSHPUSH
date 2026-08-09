export async function registerPWA() {
  if (!("serviceWorker" in navigator)) {
    console.log("[PWA] Service Worker not supported")
    return
  }

  try {
    const { registerSW } = await import("virtual:pwa-register")

    registerSW({
      immediate: true,

      onRegisteredSW(swUrl, registration) {
        console.log("[PWA] Service Worker registered")
        console.log("[PWA] URL:", swUrl)
        console.log("[PWA] registration:", registration)
      },

      onRegisterError(error) {
        console.error("[PWA] Service Worker registration failed:", error)
      },
    })
  } catch (error) {
    console.error("[PWA] Could not load PWA registration:", error)
  }
}
