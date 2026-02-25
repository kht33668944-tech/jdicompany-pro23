import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { buildTaskWhere } from "@/lib/task-auth";
import { createNotification } from "@/lib/notify";
import { success, created, errors } from "@/lib/api-response";

const VALID_STATUS = ["todo", "in_progress", "done", "on_hold", "cancelled"];
const VALID_PRIORITY = ["low", "normal", "high"];

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { teamId: true } });
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const status = searchParams.get("status");
    const teamId = searchParams.get("teamId");
    const userId = searchParams.get("userId");
    const priority = searchParams.get("priority");
    const q = searchParams.get("q")?.trim();


    const projectId = searchParams.get("projectId");
    const teamScope = searchParams.get("teamScope") === "true";
    const overdueOnly = searchParams.get("overdueOnly") === "true";

    const scopeWithTeam = buildTaskWhere(session, me?.teamId ?? null, {
      teamId: teamId || undefined,
      userId: userId || undefined,
      teamScope,
    });

    const where: {
      assigneeId?: string;
      teamId?: string;
      projectId?: string | null;
      dueDate?: Date | { gte?: Date; lte?: Date; lt?: Date };
      status?: string | object;
      priority?: string;
      title?: { contains: string; mode: "insensitive" };
    } = { ...scopeWithTeam };

    if (date) where.dueDate = new Date(date);
    else if (from && to) {
      where.dueDate = { gte: new Date(from), lte: new Date(to) };
    }
    if (overdueOnly) {
      where.dueDate = { lt: new Date(new Date().toDateString()) };
      where.status = { notIn: ["done", "cancelled"] };
    }
    if (status && VALID_STATUS.includes(status)) where.status = status;
    if (priority && VALID_PRIORITY.includes(priority)) where.priority = priority;
    if (projectId) where.projectId = projectId;
    if (q) where.title = { contains: q, mode: "insensitive" };

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      include: {
        assignee: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    const data = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      dueDate: t.dueDate,
      status: t.status,
      priority: t.priority,
      assigneeId: t.assigneeId,
      assigneeName: t.assignee.name,
      teamId: t.teamId,
      teamName: t.team.name,
      projectId: t.projectId,
      projectName: t.project?.name ?? null,
      createdBy: t.createdBy,
      createdAt: t.createdAt,
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
    const body = await req.json();
    const { title, dueDate, assigneeId, priority, description, projectId } = body;

    if (!title?.trim()) return errors.badRequest("제목을 입력해주세요.");
    if (!dueDate) return errors.badRequest("마감일이 필요합니다.");

    const { isCEO, isTeamLeader } = await import("@/lib/auth");
    const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { teamId: true, role: true } });
    if (!me?.teamId && !isCEO(session.role)) return errors.badRequest("소속 팀이 없습니다. 팀 배정이 필요합니다.");

    let finalAssigneeId: string;
    let finalTeamId: string;
    let finalProjectId: string | null = null;

    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, teamId: true },
      });
      if (!project) return errors.badRequest("프로젝트를 찾을 수 없습니다.");
      finalTeamId = project.teamId;
      if (!isCEO(session.role) && me?.teamId !== finalTeamId)
        return errors.forbidden("해당 팀 프로젝트에 업무를 생성할 권한이 없습니다.");
      if (assigneeId && (isCEO(session.role) || (isTeamLeader(session.role) && me?.teamId === finalTeamId))) {
        const assignee = await prisma.user.findUnique({ where: { id: assigneeId }, select: { teamId: true } });
        if (!assignee || assignee.teamId !== finalTeamId) return errors.badRequest("담당자는 해당 팀 소속이어야 합니다.");
        finalAssigneeId = assigneeId;
      } else {
        finalAssigneeId = session.sub;
      }
      finalProjectId = project.id;
    } else {
      finalTeamId = me?.teamId!;
      if (isCEO(session.role) && assigneeId) {
        const user = await prisma.user.findUnique({ where: { id: assigneeId } });
        if (!user?.teamId) return errors.badRequest("해당 사용자에게 팀이 없습니다.");
        finalTeamId = user.teamId;
        finalAssigneeId = assigneeId;
      } else if (assigneeId && isTeamLeader(session.role) && me?.teamId === finalTeamId) {
        const assignee = await prisma.user.findUnique({ where: { id: assigneeId }, select: { teamId: true } });
        if (!assignee || assignee.teamId !== finalTeamId) return errors.badRequest("담당자는 해당 팀 소속이어야 합니다.");
        finalAssigneeId = assigneeId;
      } else {
        finalAssigneeId = session.sub;
      }
    }

    const taskPriority = priority && VALID_PRIORITY.includes(priority) ? priority : "normal";

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        dueDate: new Date(dueDate),
        status: "todo",
        priority: taskPriority,
        assigneeId: finalAssigneeId,
        teamId: finalTeamId,
        projectId: finalProjectId,
        createdBy: session.sub,
      },
      include: {
        assignee: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    await createNotification(prisma, {
      userId: task.assigneeId,
      type: "task_assigned",
      title: `새 업무가 할당되었습니다: ${task.title}`,
      link: `/teams/${task.teamId}`,
    });

    return created({
      id: task.id,
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      status: task.status,
      priority: task.priority,
      assigneeId: task.assigneeId,
      teamId: task.teamId,
      projectId: task.projectId,
      projectName: task.project?.name ?? null,
      createdBy: task.createdBy,
      createdAt: task.createdAt,
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}
