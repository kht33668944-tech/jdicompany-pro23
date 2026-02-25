import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function TeamsListPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { teamId: true, role: true },
  });
  const isCEO = me?.role === "CEO";

  if (!me?.teamId && !isCEO) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <p className="text-slate-600">팀 배정이 필요합니다. 대표에게 요청하세요.</p>
      </div>
    );
  }

  if (me?.teamId && !isCEO) {
    redirect(`/teams/${me.teamId}`);
  }

  const teams = await prisma.team.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  if (teams.length === 1) redirect(`/teams/${teams[0].id}`);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-slate-800 mb-6">팀 선택</h1>
      <ul className="space-y-2">
        {teams.map((t) => (
          <li key={t.id}>
            <Link
              href={`/teams/${t.id}`}
              className="block p-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 font-medium text-slate-800"
            >
              {t.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
