import { useEffect, useState } from "react"
import { useSearchParams } from "react-router"

export default function PushTestPage() {
  const [permission, setPermission] = useState("unknown")
  const [subscription, setSubscription] = useState("")
  const [message, setMessage] = useState("알림이 보내졌습니다.")
  const [pushSubscription, setPushSubscription] = useState<PushSubscription | null>(null)
  const [searchParams] = useSearchParams()
  const isReplyMode = searchParams.get("reply") === "true"

  const [replyMessage, setReplyMessage] = useState("")

  useEffect(() => {
    async function initializePush() {
      if (!("Notification" in window)) return
      if (!("serviceWorker" in navigator)) return

      setPermission(Notification.permission)

      if (Notification.permission !== "granted") {
        return
      }

      try {
        const registration = await navigator.serviceWorker.ready

        const existingSubscription = await registration.pushManager.getSubscription()

        if (existingSubscription) {
          console.log("기존 Push Subscription 발견:", existingSubscription)

          setPushSubscription(existingSubscription)

          setSubscription(JSON.stringify(existingSubscription.toJSON(), null, 2))

          return
        }

        console.log("기존 Push Subscription 없음")
      } catch (error) {
        console.error("Push 초기화 실패:", error)
      }
    }

    initializePush()
  }, [])

  async function requestNotificationPermission() {
    if (!("Notification" in window)) {
      alert("이 브라우저는 알림을 지원하지 않습니다.")
      return
    }

    const result = await Notification.requestPermission()
    setPermission(result)

    if (result === "granted") {
      await subscribeToPush()
    }
  }

  async function subscribeToPush() {
    try {
      if (!("serviceWorker" in navigator)) {
        alert("Service Worker를 지원하지 않는 브라우저입니다.")
        return
      }

      if (Notification.permission !== "granted") {
        alert("먼저 알림 권한을 허용해주세요.")
        return
      }

      const registration = await navigator.serviceWorker.ready

      const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY

      if (!publicKey) {
        alert("VAPID Public Key가 없습니다.")
        return
      }

      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      setPushSubscription(newSubscription)

      console.log("Push Subscription:", newSubscription)

      setSubscription(JSON.stringify(newSubscription.toJSON(), null, 2))
    } catch (error) {
      console.error("Push subscription failed:", error)
      alert("Push 구독 생성 실패. Console을 확인해주세요.")
    }
  }

  async function sendPush() {
    if (!pushSubscription) {
      alert("먼저 Push 구독하기를 눌러주세요.")
      return
    }

    try {
      const response = await fetch("/push-send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscription: pushSubscription.toJSON(),
          message,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        console.error(result)
        alert("Push 전송 실패")
        return
      }

      console.log("Push sent:", result)
    } catch (error) {
      console.error("Push request failed:", error)
      alert("Push 요청 실패")
    }
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-4 text-xl font-semibold">PWA Push Test</h1>

      <p className="mb-4">현재 알림 권한: {permission}</p>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={requestNotificationPermission}
          className="rounded-md border px-4 py-2"
        >
          알림 권한 허용
        </button>

        <button type="button" onClick={subscribeToPush} className="rounded-md border px-4 py-2">
          Push 구독하기
        </button>
      </div>

      <div className="mt-6">
        <p className="mb-2">보낼 메시지</p>

        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mb-2 w-full rounded-md border px-3 py-2"
        />

        <button type="button" onClick={sendPush} className="rounded-md border px-4 py-2">
          알림 보내기
        </button>
      </div>

      {subscription && (
        <>
          <p className="mt-6 mb-2">생성된 Push Subscription:</p>

          <pre className="overflow-x-auto rounded-md border p-4 text-xs">{subscription}</pre>
        </>
      )}

      {isReplyMode && (
        <div className="mt-8 rounded-md border p-4">
          <h2 className="mb-3 text-lg font-semibold">답장하기</h2>

          <input
            type="text"
            value={replyMessage}
            onChange={(e) => setReplyMessage(e.target.value)}
            placeholder="답장을 입력하세요"
            className="mb-3 w-full rounded-md border px-3 py-2"
          />

          <button
            type="button"
            onClick={() => {
              alert(`답장 내용: ${replyMessage}`)
            }}
            className="rounded-md border px-4 py-2"
          >
            답장 전송
          </button>
        </div>
      )}
    </main>
  )
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)

  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")

  const rawData = window.atob(base64)

  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}
