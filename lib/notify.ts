import type { PrismaClient } from "@prisma/client";
import { sendPushToUser } from "@/lib/push";

const DEDUP_SECONDS = 5;

/**
 * 서버에서 알림 생성. 동일 userId + link + type 5초 이내 중복 시 생성하지 않음.
 * 생성 후 해당 사용자에게 Web Push 발송 (구독이 있는 경우).
 * 실패해도 예외를 던지지 않고 무시 (알림 실패가 메인 플로우를 깨지 않도록).
 */
export async function createNotification(
  prisma: PrismaClient,
  params: { userId: string; type: string; title: string; link?: string | null }
): Promise<void> {
  try {
    const { userId, type, title, link } = params;
    // #region agent log
    fetch('http://127.0.0.1:7707/ingest/e44db668-df21-4b1a-b1d8-a6c0db0aa402',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'dd7562'},body:JSON.stringify({sessionId:'dd7562',location:'notify.ts:createNotification',message:'createNotification entry',data:{userId,type,title:title?.slice(0,30)},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    if (!userId || !type?.trim() || !title?.trim()) return;

    const linkVal = link === undefined || link === null ? null : (link && String(link).trim()) || null;
    const since = new Date(Date.now() - DEDUP_SECONDS * 1000);

    const existing = await prisma.notification.findFirst({
      where: {
        userId,
        type: type.trim(),
        link: linkVal,
        createdAt: { gte: since },
        deletedAt: null,
      },
    });
    if (existing) {
      // #region agent log
      fetch('http://127.0.0.1:7707/ingest/e44db668-df21-4b1a-b1d8-a6c0db0aa402',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'dd7562'},body:JSON.stringify({sessionId:'dd7562',location:'notify.ts:createNotification',message:'skipped dedup',data:{userId,type},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return;
    }

    await prisma.notification.create({
      data: {
        userId,
        type: type.trim(),
        title: title.trim(),
        link: linkVal,
      },
    });

    await sendPushToUser(prisma, userId, {
      title: title.trim(),
      body: title.trim(),
      url: linkVal ?? undefined,
    });
  } catch (err) {
    // #region agent log
    fetch('http://127.0.0.1:7707/ingest/e44db668-df21-4b1a-b1d8-a6c0db0aa402',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'dd7562'},body:JSON.stringify({sessionId:'dd7562',location:'notify.ts:createNotification',message:'catch',data:{err: String((err as Error).message)},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    // 알림 생성 실패 시 메인 플로우는 유지
  }
}
