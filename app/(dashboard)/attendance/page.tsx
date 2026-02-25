import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AttendancePageClient from "@/components/AttendancePageClient";

export default async function AttendancePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { role: true, teamId: true },
  });
  const isCEO = me?.role === "CEO";
  const isTeamLeader = me?.role === "TEAM_LEADER";
  if (!isCEO && !isTeamLeader) {
    return (
      <div className="max-w-2xl mx-auto">
        <p className="text-slate-600">출퇴근 현황은 대표·팀장만 조회할 수 있습니다.</p>
      </div>
    );
  }

  const teams = isCEO
    ? await prisma.team.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
    : me?.teamId
      ? await prisma.team.findMany({
          where: { id: me.teamId },
          select: { id: true, name: true },
        })
      : [];

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-xl font-semibold text-slate-800 mb-6">출퇴근 현황</h1>
      <AttendancePageClient teams={teams} isCEO={isCEO} />
    </div>
  );
}
