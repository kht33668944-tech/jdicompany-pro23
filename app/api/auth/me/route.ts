import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { success, errors } from "@/lib/api-response";

export async function GET() {
  try {
    const session = await requireSession();
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      include: { team: true },
    });
    if (!user || !user.isActive) return errors.unauthorized();

    return success({
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl ?? null,
      teamId: user.teamId,
      teamName: user.team?.name ?? null,
      role: user.role,
      createdAt: user.createdAt,
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : undefined;
    const avatarUrl = typeof body.avatarUrl === "string" ? body.avatarUrl.trim() || null : undefined;

    const update: { name?: string; avatarUrl?: string | null } = {};
    if (name !== undefined) update.name = name;
    if (avatarUrl !== undefined) update.avatarUrl = avatarUrl;
    if (Object.keys(update).length === 0) return errors.badRequest("수정할 필드를 입력해주세요.");

    const user = await prisma.user.update({
      where: { id: session.sub },
      data: update,
      include: { team: true },
    });

    return success({
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl ?? null,
      teamId: user.teamId,
      teamName: user.team?.name ?? null,
      role: user.role,
      createdAt: user.createdAt,
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}
