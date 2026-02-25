import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isCEO, isTeamLeader } from "@/lib/auth";
import { success, errors } from "@/lib/api-response";

/** GET: 프로젝트 상세 + Task 상태별 요약 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        team: { select: { id: true, name: true } },
        tasks: {
          where: { status: { not: "cancelled" } },
          select: { id: true, title: true, status: true, dueDate: true, priority: true, assigneeId: true },
        },
      },
    });
    if (!project) return errors.notFound("프로젝트를 찾을 수 없습니다.");

    const me = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { teamId: true },
    });
    if (!isCEO(session.role) && me?.teamId !== project.teamId)
      return errors.forbidden("해당 프로젝트를 조회할 수 없습니다.");

    const tasks = project.tasks;
    const todo = tasks.filter((t) => t.status === "todo");
    const inProgress = tasks.filter((t) => t.status === "in_progress");
    const done = tasks.filter((t) => t.status === "done");
    const total = tasks.length;
    const progressPercent = total > 0 ? Math.round((done.length / total) * 100) : 0;

    return success({
      id: project.id,
      name: project.name,
      description: project.description,
      teamId: project.teamId,
      teamName: project.team.name,
      startDate: project.startDate,
      endDate: project.endDate,
      status: project.status,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      taskCount: total,
      progressPercent,
      todoCount: todo.length,
      inProgressCount: inProgress.length,
      doneCount: done.length,
      tasks: project.tasks,
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}

/** PATCH: 프로젝트 수정. 이름/설명/기간/status(archived) */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return errors.notFound("프로젝트를 찾을 수 없습니다.");

    const me = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { teamId: true, role: true },
    });
    const canEdit =
      isCEO(session.role) ||
      (isTeamLeader(me?.role ?? "") && me?.teamId === project.teamId);
    if (!canEdit) return errors.forbidden("프로젝트를 수정할 권한이 없습니다.");

    const body = await req.json();
    const { name, description, startDate, endDate, status } = body;

    const data: {
      name?: string;
      description?: string | null;
      startDate?: Date | null;
      endDate?: Date | null;
      status?: string;
    } = {};
    if (name !== undefined) data.name = String(name).trim();
    if (description !== undefined) data.description = description?.trim() || null;
    if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null;
    if (status === "active" || status === "archived") data.status = status;

    if (data.name && data.name !== project.name) {
      const existing = await prisma.project.findUnique({
        where: { teamId_name: { teamId: project.teamId, name: data.name } },
      });
      if (existing) return errors.duplicate("같은 팀에 동일한 이름의 프로젝트가 있습니다.");
    }

    const updated = await prisma.project.update({
      where: { id },
      data,
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
    return success(updated);
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}
