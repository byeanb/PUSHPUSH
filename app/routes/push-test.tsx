import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router"

import { pushSupabase } from "~/lib/push-supabase"

export default function PushTestPage() {
  const [permission, setPermission] = useState("unknown")
  const [subscription, setSubscription] = useState("")
  const [message, setMessage] = useState("알림이 보내졌습니다.")
  const [pushSubscription, setPushSubscription] = useState<PushSubscription | null>(null)

  const [replyMessage, setReplyMessage] = useState("")

  const [searchParams] = useSearchParams()
  const isReplyMode = searchParams.get("reply") === "true"

  // 동시에 구독 함수가 두 번 실행되는 것 방지
  const isSubscribingRef = useRef(false)

  // 페이지에 들어왔을 때 기존 Push 구독 확인
  useEffect(() => {
    async function initializePush() {
      if (!("Notification" in window)) return
      if (!("serviceWorker" in navigator)) return

      setPermission(Notification.permission)

      // 아직 알림 권한을 허용하지 않은 사용자는 아무것도 하지 않음
      if (Notification.permission !== "granted") {
        return
      }

      try {
        const registration = await navigator.serviceWorker.ready

        // 새 구독을 만들지 않고 기존 구독만 확인
        const existingSubscription = await registration.pushManager.getSubscription()

        if (!existingSubscription) {
          console.log("기존 Push Subscription 없음")
          return
        }

        console.log("기존 Push Subscription 발견:", existingSubscription)

        setPushSubscription(existingSubscription)

        const json = existingSubscription.toJSON()

        setSubscription(JSON.stringify(json, null, 2))

        // 기존 구독도 Supabase와 동기화
        if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
          const { error } = await pushSupabase.from("push_subscriptions").upsert(
            {
              device_name: getDeviceName(),
              endpoint: json.endpoint,
              p256dh: json.keys.p256dh,
              auth: json.keys.auth,
            },
            {
              onConflict: "endpoint",
            }
          )

          if (error) {
            console.error("기존 Subscription Supabase 동기화 실패:", error)
          } else {
            console.log("기존 Subscription Supabase 동기화 완료")
          }
        }
      } catch (error) {
        console.error("Push 초기화 실패:", error)
      }
    }

    initializePush()
  }, [])

  // 최초 알림 권한 요청
  async function requestNotificationPermission() {
    if (!("Notification" in window)) {
      alert("이 브라우저는 알림을 지원하지 않습니다.")
      return
    }

    const result = await Notification.requestPermission()

    setPermission(result)

    // 사용자가 허용했을 때만 Push 구독 생성
    if (result === "granted") {
      await subscribeToPush()
    }
  }

  // Push 구독 생성 또는 기존 구독 재사용
  async function subscribeToPush() {
    // 동시에 두 번 실행되는 것 방지
    if (isSubscribingRef.current) {
      console.log("이미 Push 구독 처리 중입니다.")
      return
    }

    isSubscribingRef.current = true

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

      // 먼저 기존 구독 확인
      let newSubscription = await registration.pushManager.getSubscription()

      if (newSubscription) {
        console.log("기존 Push Subscription 재사용:", newSubscription)
      } else {
        // 기존 구독이 진짜 없을 때만 새로 생성
        newSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        })

        console.log("새 Push Subscription 생성:", newSubscription)
      }

      const json = newSubscription.toJSON()

      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("Push Subscription 정보가 완전하지 않습니다.")
      }

      // endpoint가 UNIQUE이므로 같은 구독은 새 행으로 안 생김
      const { error } = await pushSupabase.from("push_subscriptions").upsert(
        {
          device_name: getDeviceName(),
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
        },
        {
          onConflict: "endpoint",
        }
      )

      if (error) {
        console.error("Supabase 저장 실패:", error)
        throw error
      }

      console.log("Supabase에 Push Subscription 저장 완료")

      setPushSubscription(newSubscription)
      setSubscription(JSON.stringify(json, null, 2))
    } catch (error) {
      console.error("Push subscription failed:", error)

      alert("Push 구독 생성 실패. Console을 확인해주세요.")
    } finally {
      isSubscribingRef.current = false
    }
  }

  // Push 구독 끊기
  async function unsubscribeFromPush() {
    try {
      if (!("serviceWorker" in navigator)) {
        alert("Service Worker를 지원하지 않는 브라우저입니다.")
        return
      }

      const registration = await navigator.serviceWorker.ready

      const existingSubscription = await registration.pushManager.getSubscription()

      if (!existingSubscription) {
        alert("현재 활성화된 Push 구독이 없습니다.")

        setPushSubscription(null)
        setSubscription("")

        return
      }

      const endpoint = existingSubscription.endpoint

      // 먼저 Supabase에서 이 기기의 구독 정보 삭제
      const { error } = await pushSupabase
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", endpoint)

      if (error) {
        console.error("Supabase Subscription 삭제 실패:", error)

        throw error
      }

      // 브라우저 Push Service 구독 해제
      const success = await existingSubscription.unsubscribe()

      if (!success) {
        throw new Error("브라우저 Push 구독 해제 실패")
      }

      console.log("Push 구독 해제 완료")

      setPushSubscription(null)
      setSubscription("")

      alert("Push 구독을 끊었습니다.")
    } catch (error) {
      console.error("Push 구독 해제 실패:", error)

      alert("Push 구독 해제에 실패했습니다. Console을 확인해주세요.")
    }
  }

  // 현재 브라우저에 테스트 Push 전송
  async function sendPush() {
    try {
      const response = await fetch("/push-send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          target: "mobile",
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        console.error(result)
        alert(result.error ?? "Push 전송 실패")
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

      <p className="mb-2">현재 알림 권한: {permission}</p>

      <p className="mb-4">Push 구독 상태: {pushSubscription ? "구독 중" : "구독 안 됨"}</p>

      <div className="mb-6 flex flex-wrap gap-2">
        {permission !== "granted" && (
          <button
            type="button"
            onClick={requestNotificationPermission}
            className="rounded-md border px-4 py-2"
          >
            알림 권한 허용
          </button>
        )}

        {pushSubscription && (
          <button
            type="button"
            onClick={unsubscribeFromPush}
            className="rounded-md border px-4 py-2"
          >
            Push 구독 끊기
          </button>
        )}

        {permission === "granted" && !pushSubscription && (
          <button type="button" onClick={subscribeToPush} className="rounded-md border px-4 py-2">
            Push 다시 구독하기
          </button>
        )}
      </div>

      <div className="mt-6">
        <p className="mb-2">보낼 메시지</p>

        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mb-2 w-full rounded-md border px-3 py-2"
        />

        <button
          type="button"
          onClick={sendPush}
          disabled={!pushSubscription}
          className="rounded-md border px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          알림 보내기
        </button>
      </div>

      {subscription && (
        <>
          <p className="mt-6 mb-2">현재 Push Subscription:</p>

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

function getDeviceName() {
  const userAgent = navigator.userAgent.toLowerCase()

  if (userAgent.includes("android") || userAgent.includes("iphone") || userAgent.includes("ipad")) {
    return "mobile"
  }

  return "desktop"
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)

  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")

  const rawData = window.atob(base64)

  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}
