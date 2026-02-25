import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isCEO } from "@/lib/auth";
import { success, errors } from "@/lib/api-response";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    if (!isCEO(session.role)) return errors.forbidden();

    const { id } = await params;
    const body = await req.json();
    const { type, title, content, targetType, targetTeamId, eventDate } = body;

    const ann = await prisma.announcement.findUnique({ where: { id } });
    if (!ann) return errors.notFound("공지를 찾을 수 없습니다.");

    const updated = await prisma.announcement.update({
      where: { id },
      data: {
        ...(type && { type: type === "company_event" ? "company_event" : "notice" }),
        ...(title !== undefined && { title: title.trim() }),
        ...(content !== undefined && { content: content?.trim() || null }),
        ...(targetType !== undefined && { targetType: targetType === "team" ? "team" : "all" }),
        ...(targetTeamId !== undefined && { targetTeamId: targetTeamId || null }),
        ...(eventDate !== undefined && { eventDate: eventDate ? new Date(eventDate) : null }),
      },
    });

    return success({
      id: updated.id,
      type: updated.type,
      title: updated.title,
      updatedAt: updated.updatedAt,
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    if (!isCEO(session.role)) return errors.forbidden();

    const { id } = await params;
    const ann = await prisma.announcement.findUnique({ where: { id } });
    if (!ann) return errors.notFound("공지를 찾을 수 없습니다.");

    await prisma.announcement.delete({ where: { id } });
    return success({ message: "공지가 삭제되었습니다." });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}
