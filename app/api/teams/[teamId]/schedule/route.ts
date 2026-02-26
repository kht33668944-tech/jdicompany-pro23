import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isCEO, isTeamLeader } from "@/lib/auth";
import { success, errors } from "@/lib/api-response";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

/**
 * GET /api/teams/[teamId]/schedule?from=...&to=...
 * 팀의 Task(마감/상태), Event(팀 일정), LeaveRequest(승인/대기)
 * 권한: 해당 팀 소속 또는 CEO
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = await requireSession();
    const { teamId } = await params;
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const me = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { teamId: true },
    });
    if (!isCEO(session.role) && me?.teamId !== teamId)
      return errors.forbidden("해당 팀 스케줄을 조회할 수 없습니다.");

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) return errors.notFound("팀을 찾을 수 없습니다.");

    const fromDate = from ? new Date(from) : startOfWeek(new Date(), { weekStartsOn: 1 });
    const toDate = to ? new Date(to) : endOfMonth(new Date());

    const [tasks, events, leaveRequests] = await Promise.all([
      prisma.task.findMany({
        where: {
          teamId,
          status: { not: "cancelled" },
          dueDate: { gte: fromDate, lte: toDate },
        },
        orderBy: { dueDate: "asc" },
        take: 50,
        include: {
          assignee: { select: { name: true } },
          project: { select: { name: true } },
        },
      }),
      prisma.event.findMany({
        where: {
          teamId,
          startAt: { gte: fromDate, lte: toDate },
        },
        orderBy: { startAt: "asc" },
        take: 50,
        include: {
          assignee: { select: { name: true, avatarUrl: true } },
        },
      }),
      prisma.leaveRequest.findMany({
        where: {
          user: { teamId },
          status: { in: ["pending", "approved"] },
          startDate: { lte: toDate },
          endDate: { gte: fromDate },
        },
        orderBy: { startDate: "asc" },
        include: { user: { select: { name: true, avatarUrl: true } } },
      }),
    ]);

    return success({
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate,
        status: t.status,
        assigneeName: t.assignee.name,
        projectName: t.project?.name ?? null,
      })),
      events: events.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        startAt: e.startAt,
        endAt: e.endAt,
        assigneeName: e.assignee.name,
        assigneeAvatarUrl: e.assignee.avatarUrl ?? null,
        category: e.category ?? null,
        color: e.color ?? "blue",
      })),
      leaveRequests: leaveRequests.map((l) => ({
        id: l.id,
        userId: l.userId,
        userName: l.user.name,
        userAvatarUrl: l.user.avatarUrl ?? null,
        startDate: l.startDate,
        endDate: l.endDate,
        status: l.status,
        reason: l.reason,
      })),
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}
