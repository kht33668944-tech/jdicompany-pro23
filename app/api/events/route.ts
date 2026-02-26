import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isCEO } from "@/lib/auth";
import { success, created, errors } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const userId = searchParams.get("userId");
    const teamId = searchParams.get("teamId");
    const includeAnnouncements = searchParams.get("includeAnnouncements") !== "false";

    if (!start || !end) return errors.badRequest("start, end 날짜가 필요합니다.");
    const startDate = new Date(start);
    const endDate = new Date(end);

    const where: {
      startAt: { gte: Date; lte: Date };
      assigneeId?: string;
      teamId?: string;
    } = {
      startAt: { gte: startDate, lte: endDate },
    };

    if (isCEO(session.role)) {
      if (userId) where.assigneeId = userId;
      if (teamId) where.teamId = teamId;
    } else {
      where.assigneeId = session.sub;
    }

    const events = await prisma.event.findMany({
      where,
      orderBy: { startAt: "asc" },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        team: { select: { id: true, name: true } },
      },
    });

    let announcements: { id: string; title: string; type: string; eventDate: Date | null; targetType: string; targetTeamId: string | null }[] = [];
    if (includeAnnouncements) {
      const ann = await prisma.announcement.findMany({
        where: {
          OR: [
            { eventDate: null },
            { eventDate: { gte: startDate, lte: endDate } },
          ],
        },
        select: { id: true, title: true, type: true, eventDate: true, targetType: true, targetTeamId: true },
      });
      announcements = ann;
    }

    const eventList = events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      start: e.startAt,
      end: e.endAt,
      assigneeId: e.assigneeId,
      assigneeName: e.assignee.name,
      assigneeAvatarUrl: e.assignee.avatarUrl ?? null,
      teamId: e.teamId,
      teamName: e.team.name,
      status: e.status,
      priority: e.priority,
      recurrence: e.recurrence,
      remindAt: e.remindAt,
      category: e.category ?? null,
      color: e.color ?? null,
      isAnnouncement: false,
      createdBy: e.createdBy,
      createdAt: e.createdAt,
    }));

    const announcementEvents = announcements
      .filter((a) => {
        if (a.targetType === "all") return true;
        if (isCEO(session.role)) return true;
        return false;
      })
      .map((a) => ({
        id: `ann-${a.id}`,
        title: a.title,
        description: null,
        start: a.eventDate ?? startDate,
        end: a.eventDate ?? startDate,
        assigneeId: null,
        assigneeName: null,
        assigneeAvatarUrl: null,
        teamId: null,
        teamName: null,
        status: "scheduled",
        priority: "normal",
        recurrence: null,
        remindAt: null,
        category: "전체 공지",
        color: "slate",
        isAnnouncement: true,
        createdBy: null,
        createdAt: null,
      }));

    return success([...eventList, ...announcementEvents]);
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const { title, description, start, end, assigneeId, teamId, status, priority, recurrence, remindMinutesBefore, category, color } = body;

    if (!title?.trim()) return errors.badRequest("제목을 입력해주세요.");
    if (!start || !end) return errors.badRequest("시작·종료 일시가 필요합니다.");

    const startAt = new Date(start);
    const endAt = new Date(end);
    if (endAt < startAt) return errors.badRequest("종료일시가 시작일시보다 이전일 수 없습니다.");

    let finalAssigneeId = assigneeId;
    let finalTeamId = teamId;

    if (isCEO(session.role)) {
      if (!finalAssigneeId || !finalTeamId) return errors.badRequest("담당자와 팀을 선택해주세요.");
    } else {
      finalAssigneeId = session.sub;
      const me = await prisma.user.findUnique({ where: { id: session.sub } });
      if (!me?.teamId) return errors.badRequest("소속 팀이 없습니다.");
      finalTeamId = me.teamId;
    }

    const remindAt = remindMinutesBefore != null
      ? new Date(startAt.getTime() - remindMinutesBefore * 60 * 1000)
      : null;

    const event = await prisma.event.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        startAt,
        endAt,
        assigneeId: finalAssigneeId,
        teamId: finalTeamId,
        status: status || "scheduled",
        priority: priority || "normal",
        recurrence: recurrence ?? undefined,
        remindAt,
        category: category && ["전체 공지", "팀 일정", "연차", "기타"].includes(category) ? category : null,
        color: color && ["blue", "green", "purple", "orange", "pink", "red", "slate"].includes(color) ? color : null,
        createdBy: session.sub,
      },
      include: {
        assignee: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
      },
    });

    return created({
      id: event.id,
      title: event.title,
      start: event.startAt,
      end: event.endAt,
      assigneeId: event.assigneeId,
      teamId: event.teamId,
      status: event.status,
      priority: event.priority,
      createdAt: event.createdAt,
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}
