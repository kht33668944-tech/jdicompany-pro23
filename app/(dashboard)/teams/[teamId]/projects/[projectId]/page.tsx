import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import ProjectKanban from "@/components/ProjectKanban";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ teamId: string; projectId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { teamId, projectId } = await params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { team: { select: { id: true, name: true } } },
  });
  if (!project || project.teamId !== teamId) notFound();

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { teamId: true, role: true },
  });
  const isCEO = me?.role === "CEO";
  const isMember = me?.teamId === teamId;
  if (!isCEO && !isMember) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <p className="text-slate-600">해당 프로젝트에 접근할 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/teams/${teamId}`}
          className="text-sm text-slate-500 hover:text-slate-700 mb-2 inline-block"
        >
          ← {project.team.name} 팀으로
        </Link>
        <h1 className="text-xl font-semibold text-slate-800">{project.name}</h1>
        {project.description && (
          <p className="text-slate-600 mt-1">{project.description}</p>
        )}
        {(project.startDate || project.endDate) && (
          <p className="text-sm text-slate-500 mt-1">
            {project.startDate && format(new Date(project.startDate), "yyyy.MM.dd", { locale: ko })}
            {project.startDate && project.endDate && " ~ "}
            {project.endDate && format(new Date(project.endDate), "yyyy.MM.dd", { locale: ko })}
          </p>
        )}
      </div>
      <ProjectKanban
        projectId={project.id}
        teamId={project.teamId}
        projectName={project.name}
      />
    </div>
  );
}
