import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AnnouncementsList from "@/components/AnnouncementsList";

export default async function AnnouncementsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { role: true },
  });
  const isCEO = user?.role === "CEO";
  const isTeamLeader = user?.role === "TEAM_LEADER";
  const canCreate = isCEO || isTeamLeader;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold text-slate-800 mb-4">공지</h1>
      <p className="text-slate-600 text-sm mb-6">
        공지 목록입니다. 캘린더에서도 확인할 수 있습니다.
      </p>
      <AnnouncementsList canCreate={canCreate} />
    </div>
  );
}
