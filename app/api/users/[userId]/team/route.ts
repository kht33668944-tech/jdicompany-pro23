import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isCEO } from "@/lib/auth";
import { success, errors } from "@/lib/api-response";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await requireSession();
    if (!isCEO(session.role)) return errors.forbidden();

    const { userId } = await params;
    const body = await req.json();
    const teamId = body.teamId;

    if (teamId !== null && (typeof teamId !== "string" || !teamId.trim())) {
      return errors.badRequest("teamId는 문자열 또는 null이어야 합니다.");
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return errors.notFound("사용자를 찾을 수 없습니다.");

    if (teamId) {
      const team = await prisma.team.findUnique({ where: { id: teamId } });
      if (!team) return errors.notFound("팀을 찾을 수 없습니다.");
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { teamId: teamId?.trim() || null },
      include: { team: true },
    });

    return success({
      id: updated.id,
      username: updated.username,
      name: updated.name,
      email: updated.email,
      teamId: updated.teamId,
      teamName: updated.team?.name ?? null,
      role: updated.role,
      status: updated.status,
      createdAt: updated.createdAt,
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}
