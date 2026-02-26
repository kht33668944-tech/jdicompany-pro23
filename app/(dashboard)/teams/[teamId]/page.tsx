import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isCEO, isTeamLeader } from "@/lib/auth";
import TeamPageContent from "@/components/TeamPageContent";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { teamId } = await params;
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, name: true },
  });
  if (!team) notFound();

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { teamId: true, role: true },
  });
  const isMember = me?.teamId === teamId;
  if (!isCEO(session.role) && !isMember) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <p className="text-slate-600">해당 팀 페이지에 접근할 수 없습니다.</p>
      </div>
    );
  }

  const canCreateProject = isCEO(session.role) || (isTeamLeader(me?.role ?? "") && isMember);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
      <h1 className="mb-4 text-xl font-semibold text-slate-800 sm:mb-6 sm:text-2xl">{team.name}</h1>
      <TeamPageContent
        teamId={team.id}
        teamName={team.name}
        canCreateProject={canCreateProject}
      />
    </div>
  );
}
