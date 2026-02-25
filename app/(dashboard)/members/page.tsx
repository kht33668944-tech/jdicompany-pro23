import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import MembersTable from "@/components/MembersTable";

export default async function MembersPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.role === "TEAM_MEMBER") redirect("/dashboard");

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { role: true, teamId: true },
  });
  if (!me) redirect("/login");

  const userWhere = me.role === "CEO" ? { isActive: true } : { isActive: true, teamId: me.teamId ?? undefined };
  const [users, teams] = await Promise.all([
    prisma.user.findMany({
      where: userWhere,
      orderBy: [{ role: "asc" }, { name: "asc" }],
      include: { team: true },
    }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
  ]);

  const usersData = users.map((u) => ({
    id: u.id,
    username: u.username,
    name: u.name,
    email: u.email,
    teamId: u.teamId,
    teamName: u.team?.name ?? null,
    role: u.role,
    status: u.status,
  }));

  const teamsData = teams.map((t) => ({ id: t.id, name: t.name }));

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-xl font-semibold text-slate-800 mb-4">직원 관리</h1>
      <p className="text-slate-600 text-sm mb-6">
        {me.role === "CEO" ? "직원의 소속 팀과 역할을 설정할 수 있습니다." : "같은 팀 직원의 역할만 변경할 수 있습니다."}
      </p>
      <MembersTable
        initialUsers={usersData}
        initialTeams={teamsData}
        currentUserRole={me.role}
        currentUserTeamId={me.teamId ?? null}
      />
    </div>
  );
}
