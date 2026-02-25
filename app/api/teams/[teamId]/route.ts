import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isCEO } from "@/lib/auth";
import { success, errors } from "@/lib/api-response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = await requireSession();
    const { teamId } = await params;

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { _count: { select: { users: true } } },
    });
    if (!team) return errors.notFound("팀을 찾을 수 없습니다.");

    const me = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { teamId: true, role: true },
    });
    if (!isCEO(session.role) && me?.teamId !== teamId)
      return errors.forbidden("해당 팀을 조회할 수 없습니다.");

    return success({
      id: team.id,
      name: team.name,
      description: team.description,
      memberCount: team._count.users,
      createdAt: team.createdAt,
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = await requireSession();
    if (!isCEO(session.role)) return errors.forbidden();

    const { teamId } = await params;
    const body = await req.json();
    const { name, description } = body;

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) return errors.notFound("팀을 찾을 수 없습니다.");

    if (name?.trim()) {
      const existing = await prisma.team.findFirst({
        where: { name: name.trim(), id: { not: teamId } },
      });
      if (existing) return errors.duplicate("이미 같은 이름의 팀이 있습니다.");
    }

    const updated = await prisma.team.update({
      where: { id: teamId },
      data: {
        ...(name?.trim() && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
      },
      include: { _count: { select: { users: true } } },
    });

    return success({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      memberCount: updated._count.users,
      createdAt: updated.createdAt,
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = await requireSession();
    if (!isCEO(session.role)) return errors.forbidden();

    const { teamId } = await params;
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) return errors.notFound("팀을 찾을 수 없습니다.");

    await prisma.team.delete({ where: { id: teamId } });
    return success({ message: "팀이 삭제되었습니다." });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}
