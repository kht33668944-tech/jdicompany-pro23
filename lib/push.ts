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
  // #region agent log
  fetch('http://127.0.0.1:7707/ingest/e44db668-df21-4b1a-b1d8-a6c0db0aa402',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'dd7562'},body:JSON.stringify({sessionId:'dd7562',location:'push.ts:sendPushToUser',message:'sendPushToUser',data:{userId,hasVapid:!!publicKey},timestamp:Date.now(),hypothesisId:'C,D'})}).catch(()=>{});
  // #endregion
  if (!publicKey) {
    console.warn("[push] VAPID public key missing – 푸시 발송 생략. Vercel 환경 변수 확인.");
    return;
  }

  ensureVapid();

  const subs = await prisma.pushSubscription.findMany({
    where: { userId },
  });
  // #region agent log
  fetch('http://127.0.0.1:7707/ingest/e44db668-df21-4b1a-b1d8-a6c0db0aa402',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'dd7562'},body:JSON.stringify({sessionId:'dd7562',location:'push.ts:sendPushToUser',message:'subs count',data:{userId,subsCount:subs.length},timestamp:Date.now(),hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  if (subs.length === 0) {
    console.warn("[push] 구독 없음 userId=" + userId + " – 휴대폰에서 알림 켜기 후 다시 시도.");
    return;
  }

  const payloadStr = JSON.stringify({
    title: payload.title,
    body: payload.body ?? "",
    url: payload.url ?? "",
  });

  console.log("[push] 발송 시도 userId=" + userId + " 구독 수=" + subs.length);
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
      console.log("[push] 발송 성공 userId=" + userId);
    } catch (err: unknown) {
      const status = err && typeof err === "object" && "statusCode" in err ? (err as { statusCode?: number }).statusCode : undefined;
      // #region agent log
      fetch('http://127.0.0.1:7707/ingest/e44db668-df21-4b1a-b1d8-a6c0db0aa402',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'dd7562'},body:JSON.stringify({sessionId:'dd7562',location:'push.ts:sendNotification',message:'webpush error',data:{userId,status,errMsg: err instanceof Error ? err.message : String(err)},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      console.error("[push] 발송 실패 userId=" + userId + " status=" + status + " err=" + (err instanceof Error ? err.message : String(err)));
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
