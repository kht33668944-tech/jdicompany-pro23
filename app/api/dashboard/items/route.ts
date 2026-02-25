import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { buildTaskWhere } from "@/lib/task-auth";
import { success, errors } from "@/lib/api-response";

const VALID_STATUS = ["todo", "in_progress", "done", "on_hold", "cancelled"];

/**
 * 전사 대시보드 카드(준비/진행/완료/지연) 클릭 시 리스트 제공.
 * GET /api/dashboard/items?status=...&teamId=...&projectId=...&from=...&to=...
 * 권한: CEO 전체 / 팀장 본인 팀 / 팀원 teamScope 시 같은 팀 조회
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const me = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { status: true, teamId: true, role: true },
    });
    if (!me || me.status !== "APPROVED") return errors.forbidden();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const teamId = searchParams.get("teamId");
    const projectId = searchParams.get("projectId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const teamScopeParam = searchParams.get("teamScope") === "true";
    const overdueOnly = searchParams.get("overdueOnly") === "true";

    // TEAM_MEMBER / TEAM_LEADER는 대시보드 카드 클릭 시 항상 팀 범위
    const forceTeamScope = me.role === "TEAM_MEMBER" || me.role === "TEAM_LEADER";
    const teamScope = forceTeamScope || teamScopeParam || !!teamId;

    const scope = buildTaskWhere(session, me?.teamId ?? null, {
      teamId: teamId || undefined,
      teamScope,
    });

    const where: {
      assigneeId?: string;
      teamId?: string;
      projectId?: string | null;
      status?: string | object;
      dueDate?: { gte?: Date; lte?: Date; lt?: Date };
    } = { ...scope };

    if (overdueOnly) {
      where.dueDate = { lt: new Date(new Date().toDateString()) };
      where.status = { notIn: ["done", "cancelled"] };
    } else {
      if (status && VALID_STATUS.includes(status)) where.status = status;
      if (from && to) where.dueDate = { gte: new Date(from), lte: new Date(to) };
    }
    if (projectId) where.projectId = projectId;

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      take: 200,
      include: {
        assignee: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    const data = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      dueDate: t.dueDate,
      status: t.status,
      priority: t.priority,
      assigneeName: t.assignee.name,
      teamName: t.team.name,
      projectName: t.project?.name ?? null,
    }));

    return success(data);
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}
