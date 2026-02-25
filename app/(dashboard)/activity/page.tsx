import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ActivityLogClient from "@/components/ActivityLogClient";

export default async function ActivityPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { role: true },
  });
  if (!user || user.role !== "CEO") redirect("/dashboard");

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-xl font-semibold text-slate-800 mb-4">활동 로그</h1>
      <p className="text-slate-600 text-sm mb-6">
        업무 변경, 연차, 출퇴근 등 활동 내역을 필터로 조회할 수 있습니다.
      </p>
      <ActivityLogClient />
    </div>
  );
}
