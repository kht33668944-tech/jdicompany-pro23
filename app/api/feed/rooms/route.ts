import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { success, created, errors } from "@/lib/api-response";

const MY_CHAT_ROOM_NAME = "나와의 대화";

export async function GET() {
  try {
    const session = await requireSession();

    let memberships = await prisma.feedRoomMember.findMany({
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
      orderBy: { joinedAt: "desc" },
    });

    const hasMySoloRoom = memberships.some(
      (m) => m.room.members.length === 1 && m.room.members[0].userId === session.sub
    );
    if (!hasMySoloRoom) {
      await prisma.feedRoom.create({
        data: {
          name: MY_CHAT_ROOM_NAME,
          members: {
            create: [{ userId: session.sub }],
          },
        },
      });
      memberships = await prisma.feedRoomMember.findMany({
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
        orderBy: { joinedAt: "desc" },
      });
    }

    const rooms = memberships.map((m) => ({
      id: m.room.id,
      name: m.room.name,
      memberCount: m.room.members.length,
      members: m.room.members.map((mb) => ({
        id: mb.user.id,
        name: mb.user.name,
        avatarUrl: mb.user.avatarUrl ?? null,
      })),
      joinedAt: m.joinedAt,
    }));

    const sortedRooms = [...rooms].sort((a, b) => {
      const aIsSolo = a.memberCount === 1;
      const bIsSolo = b.memberCount === 1;
      if (aIsSolo && !bIsSolo) return -1;
      if (!aIsSolo && bIsSolo) return 1;
      return 0;
    });

    return success({ rooms: sortedRooms });
  } catch (e) {
    const err = e as Error;
    if (err.message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const userIds = Array.isArray(body.userIds) ? (body.userIds as string[]) : [];

    if (!name) return errors.badRequest("방 이름을 입력해주세요.");
    const memberIds = Array.from(new Set([session.sub, ...userIds]));
    if (memberIds.length < 2) return errors.badRequest("그룹 채팅은 2명 이상이어야 합니다.");

    const room = await prisma.feedRoom.create({
      data: {
        name,
        members: {
          create: memberIds.map((userId) => ({ userId })),
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
    });
  } catch (e) {
    const err = e as Error;
    if (err.message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}
