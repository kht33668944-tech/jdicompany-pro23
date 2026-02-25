import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isCEO } from "@/lib/auth";
import { success, created, errors } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const me = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { teamId: true, role: true },
    });

    const where = isCEO(session.role)
      ? undefined
      : me?.teamId
        ? { id: me.teamId }
        : { id: "none" };
    const teams = await prisma.team.findMany({
      where,
      orderBy: { name: "asc" },
      include: { _count: { select: { users: true } } },
    });

    const data = teams.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      memberCount: t._count.users,
      createdAt: t.createdAt,
    }));

    return success(data);
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!isCEO(session.role)) return errors.forbidden();

    const body = await req.json();
    const { name, description } = body;
    if (!name?.trim()) return errors.badRequest("팀명을 입력해주세요.");

    const existing = await prisma.team.findUnique({ where: { name: name.trim() } });
    if (existing) return errors.duplicate("이미 같은 이름의 팀이 있습니다.");

    const team = await prisma.team.create({
      data: { name: name.trim(), description: description?.trim() || null },
    });

    return created({
      id: team.id,
      name: team.name,
      description: team.description,
      memberCount: 0,
      createdAt: team.createdAt,
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}
