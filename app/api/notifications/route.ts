import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { success, errors } from "@/lib/api-response";

/** GET: 내 알림 목록 (삭제되지 않은 것만) */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const isRead = searchParams.get("isRead");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 100);

    const where: { userId: string; deletedAt: null; isRead?: boolean } = {
      userId: session.sub,
      deletedAt: null,
    };
    if (isRead === "true") where.isRead = true;
    if (isRead === "false") where.isRead = false;

    const list = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const data = list.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      link: n.link,
      isRead: n.isRead,
      createdAt: n.createdAt,
    }));

    return success(data);
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}
