import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { success, errors } from "@/lib/api-response";

/** 소통방 멤버 선택용: 승인(APPROVED) 사용자 목록. 본인 제외 optional. */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const excludeSelf = searchParams.get("excludeSelf") !== "false";
    const q = searchParams.get("q")?.trim();

    const where = {
      status: "APPROVED" as const,
      isActive: true,
      ...(excludeSelf ? { id: { not: session.sub } } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { username: { contains: q, mode: "insensitive" as const } },
              { email: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const users = await prisma.user.findMany({
      where,
      orderBy: { name: "asc" },
      select: { id: true, name: true, avatarUrl: true, username: true },
    });

    return success({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        avatarUrl: u.avatarUrl ?? null,
        username: u.username,
      })),
    });
  } catch (e) {
    const err = e as Error;
    if (err.message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}
