import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { canAccessTask, canWriteTask } from "@/lib/task-auth";
import { recordTaskHistory } from "@/lib/task-history";
import { createNotification } from "@/lib/notify";
import { success, errors } from "@/lib/api-response";

const VALID_STATUS = ["todo", "in_progress", "done", "on_hold", "cancelled"];
const VALID_PRIORITY = ["low", "normal", "high"];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await requireSession();
    const { taskId } = await params;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
        comments: {
          orderBy: { createdAt: "asc" },
          include: { user: { select: { id: true, name: true } } },
        },
        histories: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });
    if (!task) return errors.notFound("할 일을 찾을 수 없습니다.");

    const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { teamId: true } });
    if (!canAccessTask(session, task, me?.teamId ?? null)) return errors.forbidden();

    return success({
      id: task.id,
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      status: task.status,
      priority: task.priority,
      assigneeId: task.assigneeId,
      assigneeName: task.assignee.name,
      teamId: task.teamId,
      teamName: task.team.name,
      projectId: task.projectId,
      projectName: task.project?.name ?? null,
      createdBy: task.createdBy,
      creatorName: task.creator?.name,
      updatedBy: task.updatedBy,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      comments: task.comments.map((c) => ({
        id: c.id,
        content: c.content,
        userId: c.userId,
        userName: c.user.name,
        createdAt: c.createdAt,
      })),
      histories: task.histories.map((h) => ({
        id: h.id,
        field: h.field,
        oldValue: h.oldValue,
        newValue: h.newValue,
        userId: h.userId,
        userName: h.user.name,
        createdAt: h.createdAt,
      })),
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await requireSession();
    const { taskId } = await params;

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return errors.notFound("할 일을 찾을 수 없습니다.");

    const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { teamId: true } });
    if (!canWriteTask(session, task, me?.teamId ?? null)) return errors.forbidden();

    const body = await req.json();
    const { title, description, dueDate, status, priority, assigneeId, projectId } = body;

    const updateData: {
      title?: string;
      description?: string | null;
      dueDate?: Date;
      status?: string;
      priority?: string;
      assigneeId?: string;
      teamId?: string;
      projectId?: string | null;
      updatedBy?: string;
    } = { updatedBy: session.sub };

    if (title !== undefined) updateData.title = String(title).trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (dueDate) updateData.dueDate = new Date(dueDate);
    if (status !== undefined && VALID_STATUS.includes(status)) updateData.status = status;
    if (priority !== undefined && VALID_PRIORITY.includes(priority)) updateData.priority = priority;
    if (assigneeId !== undefined) {
      const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
      if (!assignee?.teamId) return errors.badRequest("해당 사용자에게 팀이 없습니다.");
      updateData.assigneeId = assigneeId;
      updateData.teamId = assignee.teamId;
    }
    if (projectId !== undefined) {
      if (projectId === null || projectId === "") {
        updateData.projectId = null;
      } else {
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { id: true, teamId: true },
        });
        if (!project || project.teamId !== task.teamId)
          return errors.badRequest("프로젝트가 해당 팀 소속이 아닙니다.");
        updateData.projectId = project.id;
      }
    }

    await recordTaskHistory(prisma, taskId, session.sub, {
      status: updateData.status,
      assigneeId: updateData.assigneeId,
      priority: updateData.priority,
    }, {
      status: task.status,
      assigneeId: task.assigneeId,
      priority: task.priority,
    });

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        assignee: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    if (updateData.assigneeId !== undefined && updated.assigneeId !== task.assigneeId) {
      await createNotification(prisma, {
        userId: updated.assigneeId,
        type: "task_assigned",
        title: `업무 담당자로 지정되었습니다: ${updated.title}`,
        link: `/teams/${updated.teamId}`,
      });
    }

    return success({
      id: updated.id,
      title: updated.title,
      description: updated.description,
      dueDate: updated.dueDate,
      status: updated.status,
      priority: updated.priority,
      assigneeId: updated.assigneeId,
      assigneeName: updated.assignee.name,
      teamId: updated.teamId,
      projectId: updated.projectId,
      projectName: updated.project?.name ?? null,
      updatedBy: updated.updatedBy,
      updatedAt: updated.updatedAt,
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await requireSession();
    const { taskId } = await params;

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return errors.notFound("할 일을 찾을 수 없습니다.");

    const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { teamId: true } });
    if (!canWriteTask(session, task, me?.teamId ?? null)) return errors.forbidden();

    await prisma.task.delete({ where: { id: taskId } });
    return success({ message: "할 일이 삭제되었습니다." });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}
