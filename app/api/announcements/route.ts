import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isCEO } from "@/lib/auth";
import { success, created, errors } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!isCEO(session.role)) return errors.forbidden();

    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const type = searchParams.get("type");
    const teamId = searchParams.get("teamId");

    const where: { type?: string; targetTeamId?: string; eventDate?: { gte?: Date; lte?: Date } } = {};
    if (type) where.type = type;
    if (teamId) where.targetTeamId = teamId;
    if (start && end) {
      where.eventDate = { gte: new Date(start), lte: new Date(end) };
    }

    const list = await prisma.announcement.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: { createdAt: "desc" },
      include: { creator: { select: { id: true, name: true } } },
    });

    const data = list.map((a) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      content: a.content,
      targetType: a.targetType,
      targetTeamId: a.targetTeamId,
      eventDate: a.eventDate,
      createdBy: a.createdBy,
      createdAt: a.createdAt,
    }));

    return success(data);
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!isCEO(session.role)) return errors.forbidden();

    const body = await req.json();
    const { type, title, content, targetType, targetTeamId, eventDate } = body;

    if (!type || !title?.trim()) return errors.badRequest("구분과 제목을 입력해주세요.");

    const announcement = await prisma.announcement.create({
      data: {
        type: type === "company_event" ? "company_event" : "notice",
        title: title.trim(),
        content: content?.trim() || null,
        targetType: targetType === "team" ? "team" : "all",
        targetTeamId: targetType === "team" ? targetTeamId || null : null,
        eventDate: eventDate ? new Date(eventDate) : null,
        createdBy: session.sub,
      },
    });

    return created({
      id: announcement.id,
      type: announcement.type,
      title: announcement.title,
      targetType: announcement.targetType,
      createdAt: announcement.createdAt,
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}
