import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { success, created, errors } from "@/lib/api-response";

const DEDUP_SECONDS = 5;

/**
 * POST: 알림 생성.
 * 동일 userId + link + type 5초 이내 중복 생성 금지.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const { userId, type, title, link } = body as { userId?: string; type?: string; title?: string; link?: string | null };

    const targetUserId = typeof userId === "string" && userId ? userId : session.sub;
    if (!type?.trim() || !title?.trim()) return errors.badRequest("type과 title은 필수입니다.");

    const linkVal = link === undefined || link === null ? null : (link && String(link).trim()) || null;

    const since = new Date(Date.now() - DEDUP_SECONDS * 1000);
    const existing = await prisma.notification.findFirst({
      where: {
        userId: targetUserId,
        type: type.trim(),
        link: linkVal,
        createdAt: { gte: since },
        deletedAt: null,
      },
    });
    if (existing) return success({ id: existing.id, skipped: true });

    const createdRow = await prisma.notification.create({
      data: {
        userId: targetUserId,
        type: type.trim(),
        title: title.trim(),
        link: linkVal,
      },
    });

    return created({
      id: createdRow.id,
      type: createdRow.type,
      title: createdRow.title,
      link: createdRow.link,
      isRead: createdRow.isRead,
      createdAt: createdRow.createdAt,
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}
