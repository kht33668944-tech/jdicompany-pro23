import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession, isCEO, isTeamLeader } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { success, created, errors } from "@/lib/api-response";

/** GET: CEO 전체, TEAM_LEADER 본인 팀만 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const me = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { role: true, teamId: true },
    });
    if (!me) return errors.unauthorized();

    const where: Prisma.UserWhereInput = {
      isActive: true,
    };

    if (isCEO(session.role)) {
      // CEO: 필터만 적용
    } else if (isTeamLeader(session.role) && me.teamId) {
      where.teamId = me.teamId;
    } else {
      return errors.forbidden();
    }

    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId") ?? undefined;
    const role = searchParams.get("role") ?? undefined;
    const q = searchParams.get("q")?.trim();
    if (teamId && isCEO(session.role)) where.teamId = teamId;
    if (role) where.role = role;
    const statusParam = searchParams.get("status");
    if (statusParam === "PENDING" || statusParam === "APPROVED") where.status = statusParam;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" as const } },
        { email: { contains: q, mode: "insensitive" as const } },
        { username: { contains: q, mode: "insensitive" as const } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { name: "asc" },
      include: { team: true },
    });

    const data = users.map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      email: u.email,
      teamId: u.teamId,
      teamName: u.team?.name ?? null,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
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
    const { username, password, name, email, teamId, role } = body;
    if (!username?.trim() || !password) {
      return errors.badRequest("아이디와 비밀번호를 입력해주세요.");
    }
    if (!name?.trim()) return errors.badRequest("이름을 입력해주세요.");
    if (password.length < 6) return errors.badRequest("비밀번호는 6자 이상이어야 합니다.");

    const existing = await prisma.user.findUnique({ where: { username: username.trim() } });
    if (existing) return errors.duplicate("이미 사용 중인 아이디입니다.");

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        username: username.trim(),
        passwordHash,
        name: name.trim(),
        email: email?.trim() || null,
        teamId: teamId || null,
        role: role === "CEO" ? "CEO" : role === "TEAM_LEADER" ? "TEAM_LEADER" : "TEAM_MEMBER",
        status: "APPROVED",
      },
      include: { team: true },
    });

    return created({
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      teamId: user.teamId,
      teamName: user.team?.name ?? null,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}
