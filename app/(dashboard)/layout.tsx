import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DashboardNav from "@/components/DashboardNav";
import DashboardHeader from "@/components/DashboardHeader";
import PushRegistration from "@/components/PushRegistration";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;
  if (!token) redirect("/login");

  const payload = await verifyAccessToken(token);
  if (!payload) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { team: true },
  });
  if (!user || !user.isActive) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <PushRegistration />
      <DashboardNav
        user={{
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
          teamId: user.teamId ?? null,
          teamName: user.team?.name ?? null,
          avatarUrl: user.avatarUrl ?? null,
        }}
      />
      {/* 메인: 데스크톱에서 사이드바 오른쪽, 모바일에서 상단바 아래 */}
      <main className="flex-1 pt-14 md:pt-0 md:ml-64 min-h-screen bg-slate-50">
        <DashboardHeader userName={user.name} />
        {!user.teamId && user.role !== "CEO" && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm text-amber-800">
            팀 배정이 필요합니다. 대표에게 요청하세요.
          </div>
        )}
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
