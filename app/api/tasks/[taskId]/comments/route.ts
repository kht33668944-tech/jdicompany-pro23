import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { canAccessTask } from "@/lib/task-auth";
import { createNotification } from "@/lib/notify";
import { created, errors } from "@/lib/api-response";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await requireSession();
    const { taskId } = await params;

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return errors.notFound("할 일을 찾을 수 없습니다.");

    const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { teamId: true } });
    if (!canAccessTask(session, task, me?.teamId ?? null)) return errors.forbidden();

    const body = await req.json();
    const content = body.content?.trim();
    if (!content) return errors.badRequest("댓글 내용을 입력해주세요.");

    const comment = await prisma.taskComment.create({
      data: { taskId, userId: session.sub, content },
      include: { user: { select: { id: true, name: true } } },
    });

    if (task.assigneeId !== session.sub) {
      await createNotification(prisma, {
        userId: task.assigneeId,
        type: "task_comment",
        title: `업무에 댓글이 달렸습니다: ${task.title}`,
        link: `/teams/${task.teamId}`,
      });
    }

    return created({
      id: comment.id,
      content: comment.content,
      userId: comment.userId,
      userName: comment.user.name,
      createdAt: comment.createdAt,
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}
