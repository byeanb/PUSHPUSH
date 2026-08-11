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
    (async () => {
      // 이 Service Worker가 띄운 기존 알림 전부 가져오기
      const notifications = await self.registration.getNotifications()

      // 기존 알림 전부 닫기
      notifications.forEach((notification) => {
        notification.close()
      })

      // 최신 알림 하나만 표시
      await self.registration.showNotification("PWA Push Test", {
        body: message,

        tag: "latest-message",

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
    })()
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
