import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { success, errors } from "@/lib/api-response";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await requireSession();
    const { postId } = await params;
    if (!postId) return errors.badRequest("postId가 필요합니다.");

    const post = await prisma.feedPost.findUnique({
      where: { id: postId },
      select: { id: true, roomId: true, channelId: true },
    });
    if (!post) return errors.notFound("게시글을 찾을 수 없습니다.");

    if (post.roomId) {
      const member = await prisma.feedRoomMember.findUnique({
        where: { roomId_userId: { roomId: post.roomId, userId: session.sub } },
      });
      if (!member) return errors.forbidden("이 대화방에 접근할 수 없습니다.");
    }

    await prisma.feedPostRead.upsert({
      where: {
        postId_userId: { postId, userId: session.sub },
      },
      create: { postId, userId: session.sub },
      update: { readAt: new Date() },
    });

    const count = await prisma.feedPostRead.count({ where: { postId } });
    return success({ readCount: count });
  } catch (e) {
    const err = e as Error;
    if (err.message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}
