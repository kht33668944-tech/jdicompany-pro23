import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { success, errors } from "@/lib/api-response";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string; commentId: string }> }
) {
  try {
    const session = await requireSession();
    const { taskId, commentId } = await params;

    const comment = await prisma.taskComment.findUnique({
      where: { id: commentId },
      include: { task: true },
    });
    if (!comment || comment.taskId !== taskId) return errors.notFound("댓글을 찾을 수 없습니다.");

    const { canAccessTask } = await import("@/lib/task-auth");
    const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { teamId: true } });
    if (!canAccessTask(session, comment.task, me?.teamId ?? null)) return errors.forbidden();
    if (comment.userId !== session.sub) return errors.forbidden("본인 댓글만 삭제할 수 있습니다.");

    await prisma.taskComment.delete({ where: { id: commentId } });
    return success({ message: "댓글이 삭제되었습니다." });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}
