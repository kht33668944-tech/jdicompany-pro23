import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isCEO } from "@/lib/auth";
import { success, errors } from "@/lib/api-response";

const ACTIVITY_TYPES = ["task_history", "leave", "attendance"] as const;

/**
 * GET: 활동 로그.
 * CEO → 전체, TEAM_MEMBER/LEADER → teamScope=true (본인 팀만).
 * 쿼리: teamId, userId, type (task_history | leave | attendance), limit
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const me = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { role: true, teamId: true },
    });
    if (!me) return errors.forbidden();
    if (!isCEO(me.role)) return errors.forbidden();

    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId") ?? undefined;
    const userId = searchParams.get("userId") ?? undefined;
    const type = searchParams.get("type") ?? undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 100);

    const teamScope = !isCEO(me.role) && !!me.teamId;
    const effectiveTeamId = teamScope ? me.teamId! : teamId;

    const items: { type: string; userId: string; userName: string; teamId: string | null; teamName: string | null; text: string; link: string | null; createdAt: Date }[] = [];

    if (!type || type === "task_history") {
      const taskWhere: { task?: { teamId?: string; assigneeId?: string } } = {};
      if (effectiveTeamId || userId) {
        taskWhere.task = {};
        if (effectiveTeamId) taskWhere.task.teamId = effectiveTeamId;
        if (userId) taskWhere.task.assigneeId = userId;
      }

      const histories = await prisma.taskHistory.findMany({
        where: Object.keys(taskWhere).length ? taskWhere : undefined,
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
          user: { select: { name: true } },
          task: { select: { id: true, title: true, teamId: true, team: { select: { name: true } } } },
        },
      });
      for (const h of histories) {
        if (!h.task) continue;
        const fieldLabel = h.field === "status" ? "상태" : h.field === "assignee" ? "담당자" : "우선순위";
        items.push({
          type: "task_history",
          userId: h.userId,
          userName: h.user.name,
          teamId: h.task.teamId,
          teamName: h.task.team?.name ?? null,
          text: `"${h.task.title}" ${fieldLabel} 변경`,
          link: `/tasks?taskId=${h.task.id}`,
          createdAt: h.createdAt,
        });
      }
    }

    if (!type || type === "leave") {
      const leaveWhere: { user?: { teamId?: string; id?: string } } = {};
      if (effectiveTeamId || userId) {
        leaveWhere.user = {};
        if (effectiveTeamId) leaveWhere.user.teamId = effectiveTeamId;
        if (userId) leaveWhere.user.id = userId;
      }

      const leaves = await prisma.leaveRequest.findMany({
        where: Object.keys(leaveWhere).length ? leaveWhere : undefined,
        orderBy: { createdAt: "desc" },
        take: limit,
        include: { user: { include: { team: { select: { name: true } } } } },
      });
      for (const l of leaves) {
        items.push({
          type: "leave",
          userId: l.userId,
          userName: l.user.name,
          teamId: l.user.teamId,
          teamName: l.user.team?.name ?? null,
          text: `연차 신청 (${l.startDate.toISOString().slice(0, 10)} ~ ${l.endDate.toISOString().slice(0, 10)}) ${l.status}`,
          link: null,
          createdAt: l.createdAt,
        });
      }
    }

    if (!type || type === "attendance") {
      const attWhere: { user?: { teamId?: string; id?: string } } = {};
      if (effectiveTeamId || userId) {
        attWhere.user = {};
        if (effectiveTeamId) attWhere.user.teamId = effectiveTeamId;
        if (userId) attWhere.user.id = userId;
      }

      const attendances = await prisma.attendance.findMany({
        where: Object.keys(attWhere).length ? attWhere : undefined,
        orderBy: { createdAt: "desc" },
        take: limit,
        include: { user: { include: { team: { select: { name: true } } } } },
      });
      for (const a of attendances) {
        const text = a.checkIn && !a.checkOut ? "출근 체크" : a.checkOut ? "퇴근 체크" : "출근 체크";
        const at = (a.checkOut ?? a.checkIn ?? a.createdAt) as Date;
        items.push({
          type: "attendance",
          userId: a.userId,
          userName: a.user.name,
          teamId: a.user.teamId,
          teamName: a.user.team?.name ?? null,
          text,
          link: null,
          createdAt: at,
        });
      }
    }

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const data = items.slice(0, limit).map((x) => ({
      type: x.type,
      userId: x.userId,
      userName: x.userName,
      teamId: x.teamId,
      teamName: x.teamName,
      text: x.text,
      link: x.link,
      createdAt: x.createdAt,
    }));

    return success(data);
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}
