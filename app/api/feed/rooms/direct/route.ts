import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { success, created, errors } from "@/lib/api-response";

/** 1:1 방 찾기 또는 생성. POST { otherUserId } */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const otherUserId = typeof body.otherUserId === "string" ? body.otherUserId.trim() : "";
    if (!otherUserId) return errors.badRequest("otherUserId가 필요합니다.");
    if (otherUserId === session.sub) return errors.badRequest("본인과는 1:1 채팅을 만들 수 없습니다.");

    const other = await prisma.user.findUnique({
      where: { id: otherUserId },
      select: { id: true, name: true, status: true },
    });
    if (!other || other.status !== "APPROVED") return errors.notFound("대상 사용자를 찾을 수 없습니다.");

    const myMemberships = await prisma.feedRoomMember.findMany({
      where: { userId: session.sub },
      include: {
        room: {
          include: {
            members: {
              include: { user: { select: { id: true, name: true, avatarUrl: true } } },
            },
          },
        },
      },
    });

    for (const m of myMemberships) {
      if (m.room.members.length !== 2) continue;
      const otherMember = m.room.members.find((mb) => mb.userId !== session.sub);
      if (otherMember?.userId === otherUserId) {
        return success({
          id: m.room.id,
          name: m.room.name,
          memberCount: 2,
          members: m.room.members.map((mb) => ({
            id: mb.user.id,
            name: mb.user.name,
            avatarUrl: mb.user.avatarUrl ?? null,
          })),
          existing: true,
        });
      }
    }

    const room = await prisma.feedRoom.create({
      data: {
        name: `${other.name}님과의 대화`,
        members: {
          create: [
            { userId: session.sub },
            { userId: otherUserId },
          ],
        },
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
      },
    });

    return created({
      id: room.id,
      name: room.name,
      memberCount: room.members.length,
      members: room.members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        avatarUrl: m.user.avatarUrl ?? null,
      })),
      existing: false,
    });
  } catch (e) {
    const err = e as Error;
    if (err.message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}
