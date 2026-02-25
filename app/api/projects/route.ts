import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isCEO, isTeamLeader } from "@/lib/auth";
import { success, created, errors } from "@/lib/api-response";

/** GET: 팀별 프로젝트 목록 + 진행률 요약. teamId 필수. status=active|archived */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");
    const status = searchParams.get("status");
    if (!teamId) return errors.badRequest("teamId가 필요합니다.");

    const me = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { teamId: true },
    });
    if (!isCEO(session.role) && me?.teamId !== teamId)
      return errors.forbidden("해당 팀의 프로젝트를 조회할 수 없습니다.");

    const where: { teamId: string; status?: string } = { teamId };
    if (status === "active" || status === "archived") where.status = status;

    const projects = await prisma.project.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        _count: { select: { tasks: true } },
        tasks: {
          where: { status: { not: "cancelled" } },
          select: { id: true, status: true },
        },
      },
    });

    const data = projects.map((p) => {
      const total = p.tasks.length;
      const done = p.tasks.filter((t) => t.status === "done").length;
      const progressPercent = total > 0 ? Math.round((done / total) * 100) : 0;
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        teamId: p.teamId,
        startDate: p.startDate,
        endDate: p.endDate,
        status: p.status,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        taskCount: total,
        doneCount: done,
        progressPercent,
      };
    });

    return success(data);
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}

/** POST: 프로젝트 생성. 권한: CEO 또는 해당 팀 TEAM_LEADER */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const { name, teamId, description, startDate, endDate } = body;
    if (!name?.trim()) return errors.badRequest("프로젝트 이름을 입력해주세요.");
    if (!teamId) return errors.badRequest("teamId가 필요합니다.");

    const me = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { teamId: true, role: true },
    });
    const canCreate =
      isCEO(session.role) ||
      (isTeamLeader(me?.role ?? "") && me?.teamId === teamId);
    if (!canCreate) return errors.forbidden("프로젝트를 생성할 권한이 없습니다.");

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) return errors.notFound("팀을 찾을 수 없습니다.");

    const existing = await prisma.project.findUnique({
      where: { teamId_name: { teamId, name: name.trim() } },
    });
    if (existing) return errors.duplicate("같은 팀에 동일한 이름의 프로젝트가 있습니다.");

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        teamId,
        description: description?.trim() || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status: "active",
      },
      select: {
        id: true,
        name: true,
        description: true,
        teamId: true,
        startDate: true,
        endDate: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return created(project);
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}
