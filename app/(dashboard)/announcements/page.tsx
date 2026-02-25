import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AnnouncementsList from "@/components/AnnouncementsList";
import Link from "next/link";

export default async function AnnouncementsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { role: true },
  });
  const isCEO = user?.role === "CEO";

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold text-slate-800 mb-4">공지</h1>
      {isCEO ? (
        <>
          <p className="text-slate-600 text-sm mb-6">
            등록한 공지 목록입니다. 캘린더에도 표시됩니다.
          </p>
          <AnnouncementsList />
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center">
          <p className="text-slate-600 mb-4">공지는 캘린더에서 확인할 수 있습니다.</p>
          <Link
            href="/calendar"
            className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            캘린더 보기
          </Link>
        </div>
      )}
    </div>
  );
}
