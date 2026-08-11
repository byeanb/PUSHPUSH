self.addEventListener("install", () => {
  console.log("[SW] installed")
})

self.addEventListener("activate", () => {
  console.log("[SW] activated")
})

self.addEventListener("push", (event) => {
  let message = "테스트 푸시 알림입니다!"

  if (event.data) {
    message = event.data.text()
  }

  event.waitUntil(
    self.registration.showNotification("PWA Push Test", {
      body: message,

      tag: "chat-test",

      actions: [
        {
          action: "reply",
          title: "답장하기",
        },
      ],

      data: {
        url: "/push-test",
      },
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  if (event.action === "reply") {
    event.waitUntil(clients.openWindow("/push-test?reply=true"))
    return
  }

  event.waitUntil(clients.openWindow("/push-test"))
})
