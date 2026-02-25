import type { PrismaClient } from "@prisma/client";

const DEDUP_SECONDS = 5;

/**
 * 서버에서 알림 생성. 동일 userId + link + type 5초 이내 중복 시 생성하지 않음.
 * 실패해도 예외를 던지지 않고 무시 (알림 실패가 메인 플로우를 깨지 않도록).
 */
export async function createNotification(
  prisma: PrismaClient,
  params: { userId: string; type: string; title: string; link?: string | null }
): Promise<void> {
  try {
    const { userId, type, title, link } = params;
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
    if (existing) return;

    await prisma.notification.create({
      data: {
        userId,
        type: type.trim(),
        title: title.trim(),
        link: linkVal,
      },
    });
  } catch {
    // 알림 생성 실패 시 메인 플로우는 유지
  }
}
