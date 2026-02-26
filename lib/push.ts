import webpush from "web-push";
import type { PrismaClient } from "@prisma/client";

const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";

function getVapidKeys() {
  const publicKey = process.env.VAPID_PUBLIC_KEY ?? process.env.WEB_PUSH_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY ?? process.env.WEB_PUSH_PRIVATE_KEY;
  return { publicKey, privateKey };
}

let vapidInitialized = false;

function ensureVapid() {
  if (vapidInitialized) return;
  const { publicKey, privateKey } = getVapidKeys();
  if (publicKey && privateKey) {
    webpush.setVapidDetails(VAPID_SUBJECT, publicKey, privateKey);
    vapidInitialized = true;
  }
}

export interface PushPayload {
  title: string;
  body?: string;
  url?: string;
}

/**
 * userId의 모든 PushSubscription에 푸시 발송.
 * 410 Gone / 404 Not Found 등 만료된 구독은 DB에서 삭제.
 * 실패해도 예외를 던지지 않음.
 */
export async function sendPushToUser(
  prisma: PrismaClient,
  userId: string,
  payload: PushPayload
): Promise<void> {
  const { publicKey } = getVapidKeys();
  if (!publicKey) return;

  ensureVapid();

  const subs = await prisma.pushSubscription.findMany({
    where: { userId },
  });
  if (subs.length === 0) return;

  const payloadStr = JSON.stringify({
    title: payload.title,
    body: payload.body ?? "",
    url: payload.url ?? "",
  });

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { auth: sub.auth, p256dh: sub.p256dh },
        },
        payloadStr,
        { TTL: 86400 }
      );
    } catch (err: unknown) {
      const status = err && typeof err === "object" && "statusCode" in err ? (err as { statusCode?: number }).statusCode : undefined;
      if (status === 410 || status === 404 || status === 403) {
        try {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        } catch {
          // ignore
        }
      }
    }
  }
}
