import webpush from "web-push"
import type { Route } from "./+types/push-send"

export async function action({ request }: Route.ActionArgs) {
  const { subscription, message } = await request.json()

  const publicKey = process.env.VITE_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY

  if (!publicKey || !privateKey) {
    return Response.json({ error: "VAPID keys are missing" }, { status: 500 })
  }

  webpush.setVapidDetails("mailto:test@example.com", publicKey, privateKey)

  try {
    await webpush.sendNotification(subscription, message)

    return Response.json({
      success: true,
    })
  } catch (error) {
    console.error("Push send failed:", error)

    return Response.json({ error: "Push send failed" }, { status: 500 })
  }
}
