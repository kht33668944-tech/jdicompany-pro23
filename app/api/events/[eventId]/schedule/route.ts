import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isCEO } from "@/lib/auth";
import { success, errors } from "@/lib/api-response";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const session = await requireSession();
    const { eventId } = await params;
    if (eventId.startsWith("ann-")) return errors.notFound();

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return errors.notFound("일정을 찾을 수 없습니다.");
    if (!isCEO(session.role) && event.assigneeId !== session.sub) return errors.forbidden();

    const body = await req.json();
    const { start, end } = body;
    if (!start || !end) return errors.badRequest("start, end가 필요합니다.");

    const startAt = new Date(start);
    const endAt = new Date(end);
    if (endAt < startAt) return errors.badRequest("종료일시가 시작일시보다 이전일 수 없습니다.");

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: { startAt, endAt },
    });

    return success({
      id: updated.id,
      start: updated.startAt,
      end: updated.endAt,
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}
