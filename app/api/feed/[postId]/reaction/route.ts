import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { success, errors } from "@/lib/api-response";

const ALLOWED_EMOJIS = ["👍", "✓", "💬", "❤️"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await requireSession();
    const { postId } = await params;
    if (!postId) return errors.badRequest("postId가 필요합니다.");
    const body = await req.json();
    const emoji = typeof body.emoji === "string" ? body.emoji.trim() : "";
    if (!emoji || !ALLOWED_EMOJIS.includes(emoji)) {
      return errors.badRequest("유효한 이모지를 선택해주세요.");
    }

    const post = await prisma.feedPost.findUnique({
      where: { id: postId },
      select: { id: true, roomId: true },
    });
    if (!post) return errors.notFound("게시글을 찾을 수 없습니다.");

    if (post.roomId) {
      const member = await prisma.feedRoomMember.findUnique({
        where: { roomId_userId: { roomId: post.roomId, userId: session.sub } },
      });
      if (!member) return errors.forbidden("이 대화방에 접근할 수 없습니다.");
    }

    const existing = await prisma.feedPostReaction.findUnique({
      where: {
        postId_userId_emoji: { postId, userId: session.sub, emoji },
      },
    });

    if (existing) {
      await prisma.feedPostReaction.delete({
        where: { id: existing.id },
      });
    } else {
      await prisma.feedPostReaction.create({
        data: { postId, userId: session.sub, emoji },
      });
    }

    const reactions = await prisma.feedPostReaction.findMany({
      where: { postId },
    });
    const reactionCounts: Record<string, number> = {};
    for (const r of reactions) {
      reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
    }
    return success({ reactions: reactionCounts });
  } catch (e) {
    const err = e as Error;
    if (err.message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}
