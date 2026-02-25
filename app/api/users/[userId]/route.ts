import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isCEO, isTeamLeader } from "@/lib/auth";
import { success, errors } from "@/lib/api-response";

/** GET: CEO 전체, TEAM_LEADER 본인 팀 사용자만 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await requireSession();
    const { userId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { team: true },
    });
    if (!user) return errors.notFound("사용자를 찾을 수 없습니다.");

    const me = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { role: true, teamId: true },
    });
    if (!me) return errors.unauthorized();
    if (isCEO(session.role)) {
      // ok
    } else if (isTeamLeader(session.role) && me.teamId && user.teamId === me.teamId) {
      // ok
    } else {
      return errors.forbidden();
    }

    return success({
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

/** PUT: CEO 전체 수정. TEAM_LEADER는 본인 팀만, role은 TEAM_LEADER/TEAM_MEMBER만. TEAM_MEMBER는 role 변경 불가 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await requireSession();
    const { userId } = await params;
    const body = await req.json();
    const { name, email, teamId, role } = body;

    const me = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { role: true, teamId: true },
    });
    if (!me) return errors.unauthorized();

    if (me.role === "TEAM_MEMBER") return errors.forbidden("역할 변경 권한이 없습니다.");

    const user = await prisma.user.findUnique({ where: { id: userId }, include: { team: true } });
    if (!user) return errors.notFound("사용자를 찾을 수 없습니다.");

    if (isCEO(session.role)) {
      // CEO: 모든 필드 수정 가능
    } else if (isTeamLeader(session.role) && me.teamId && user.teamId === me.teamId) {
      // TEAM_LEADER: 같은 팀만. role은 CEO로 설정 불가
      if (role !== undefined && role === "CEO") return errors.forbidden("팀장은 CEO로 지정할 수 없습니다.");
      if (teamId !== undefined && teamId !== user.teamId) return errors.forbidden("다른 팀으로 이동은 대표만 가능합니다.");
    } else {
      return errors.forbidden();
    }

    const updateData: { name?: string; email?: string | null; teamId?: string | null; role?: string } = {};
    if (name?.trim()) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email?.trim() || null;
    if (teamId !== undefined && isCEO(session.role)) updateData.teamId = teamId || null;
    if (role !== undefined) {
      const r = role === "CEO" ? "CEO" : role === "TEAM_LEADER" ? "TEAM_LEADER" : "TEAM_MEMBER";
      if (!isCEO(session.role) && r === "CEO") return errors.forbidden("CEO 역할은 대표만 지정할 수 있습니다.");
      updateData.role = r;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await requireSession();
    if (!isCEO(session.role)) return errors.forbidden();

    const { userId } = await params;
    if (userId === session.sub) return errors.badRequest("본인 계정은 비활성화할 수 없습니다.");

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return errors.notFound("사용자를 찾을 수 없습니다.");

    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    return success({ message: "직원 계정이 비활성화되었습니다." });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}
