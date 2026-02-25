import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { success, errors } from "@/lib/api-response";

/** PATCH: 읽음 처리 또는 soft delete (deletedAt 설정) */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { isRead, deleted } = body as { isRead?: boolean; deleted?: boolean };

    const notification = await prisma.notification.findUnique({
      where: { id },
    });
    if (!notification) return errors.notFound("알림을 찾을 수 없습니다.");
    if (notification.userId !== session.sub) return errors.forbidden();

    const data: { isRead?: boolean; deletedAt?: Date | null } = {};
    if (typeof isRead === "boolean") data.isRead = isRead;
    if (deleted === true) data.deletedAt = new Date();

    if (Object.keys(data).length === 0) return success(notification);

    const updated = await prisma.notification.update({
      where: { id },
      data,
    });

    return success({
      id: updated.id,
      type: updated.type,
      title: updated.title,
      link: updated.link,
      isRead: updated.isRead,
      deletedAt: updated.deletedAt,
      createdAt: updated.createdAt,
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}
