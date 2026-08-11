import { createClient } from "@supabase/supabase-js"
import webpush from "web-push"

import type { Route } from "./+types/push-send"

export async function action({ request }: Route.ActionArgs) {
  try {
    const { message, target = "mobile" } = await request.json()

    if (!message) {
      return Response.json({ error: "메시지가 없습니다." }, { status: 400 })
    }

    const supabaseUrl = process.env.VITE_PUSH_SUPABASE_URL
    const supabaseSecretKey = process.env.PUSH_SUPABASE_SECRET_KEY

    const vapidPublicKey = process.env.VITE_VAPID_PUBLIC_KEY

    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY

    if (!supabaseUrl || !supabaseSecretKey || !vapidPublicKey || !vapidPrivateKey) {
      console.error("서버 환경변수가 누락되었습니다.", {
        supabaseUrl: Boolean(supabaseUrl),
        supabaseSecretKey: Boolean(supabaseSecretKey),
        vapidPublicKey: Boolean(vapidPublicKey),
        vapidPrivateKey: Boolean(vapidPrivateKey),
      })

      return Response.json({ error: "서버 환경변수가 누락되었습니다." }, { status: 500 })
    }

    // 서버 전용 Supabase client
    const supabase = createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    // mobile 기기의 Push Subscription 조회
    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth, device_name")
      .eq("device_name", target)

    if (error) {
      console.error("Subscription 조회 실패:", error)

      return Response.json({ error: "Subscription 조회 실패" }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return Response.json(
        {
          error: `${target} Push Subscription이 없습니다.`,
        },
        { status: 404 }
      )
    }

    webpush.setVapidDetails("mailto:test@example.com", vapidPublicKey, vapidPrivateKey)

    const results = []

    for (const row of data) {
      const subscription = {
        endpoint: row.endpoint,
        keys: {
          p256dh: row.p256dh,
          auth: row.auth,
        },
      }

      try {
        await webpush.sendNotification(subscription, message)

        results.push({
          endpoint: row.endpoint,
          success: true,
        })
      } catch (error: any) {
        console.error("개별 Push 전송 실패:", error)

        results.push({
          endpoint: row.endpoint,
          success: false,
          statusCode: error?.statusCode ?? null,
        })
      }
    }

    return Response.json({
      success: true,
      target,
      sent: results.filter((item) => item.success).length,
      failed: results.filter((item) => !item.success).length,
      results,
    })
  } catch (error) {
    console.error("Push API 오류:", error)

    return Response.json({ error: "Push 전송 중 오류 발생" }, { status: 500 })
  }
}
