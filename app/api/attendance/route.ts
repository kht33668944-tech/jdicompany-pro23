import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isCEO, isTeamLeader } from "@/lib/auth";
import { success, errors } from "@/lib/api-response";
import { startOfDay, endOfDay } from "date-fns";

/** GET: 출퇴근 목록. 본인만 또는 CEO/팀장 시 팀/전체 조회 (날짜·팀 필터) */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const me = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { role: true, teamId: true },
    });
    if (!me) return errors.unauthorized();

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const teamId = searchParams.get("teamId");
    const userId = searchParams.get("userId");

    const isScopeAll = isCEO(me.role);
    const isScopeTeam = isTeamLeader(me.role) && me.teamId;

    let where: { user?: { id?: string; teamId?: string }; date?: { gte?: Date; lte?: Date } } = {};

    if (userId && (isScopeAll || (isScopeTeam && me.teamId === teamId))) {
      where.user = { id: userId };
    } else if (teamId && isScopeAll) {
      where.user = { teamId };
    } else if (isScopeTeam && me.teamId) {
      where.user = { teamId: me.teamId };
    } else {
      where.user = { id: session.sub };
    }

    if (from) where.date = { ...where.date, gte: startOfDay(new Date(from)) };
    if (to) where.date = { ...where.date, lte: endOfDay(new Date(to)) };

    const list = await prisma.attendance.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: {
        user: { select: { id: true, name: true, teamId: true, team: { select: { name: true } } } },
      },
    });

    const data = list.map((a) => ({
      id: a.id,
      userId: a.userId,
      userName: a.user.name,
      teamName: a.user.team?.name ?? null,
      date: a.date,
      checkIn: a.checkIn,
      checkOut: a.checkOut,
      workMinutes:
        a.checkIn && a.checkOut
          ? Math.round((new Date(a.checkOut).getTime() - new Date(a.checkIn).getTime()) / 60000)
          : null,
    }));

    return success(data);
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}
