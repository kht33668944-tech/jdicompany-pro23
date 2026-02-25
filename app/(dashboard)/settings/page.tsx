import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SettingsForm from "@/components/SettingsForm";
import ProfileEditForm from "@/components/ProfileEditForm";
import TeamUserManagement from "@/components/TeamUserManagement";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    include: { team: true },
  });
  if (!user) redirect("/login");

  const isCEO = user.role === "CEO";

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold text-slate-800 mb-6">설정</h1>
      <div className="space-y-8">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-medium text-slate-800 mb-4">내 정보</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-slate-500">이름</dt>
            <dd className="text-slate-800">{user.name}</dd>
            <dt className="text-slate-500">아이디</dt>
            <dd className="text-slate-800">{user.username}</dd>
            <dt className="text-slate-500">팀</dt>
            <dd className="text-slate-800">{user.team?.name ?? "-"}</dd>
          </dl>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-medium text-slate-800 mb-4">프로필 편집</h2>
          <ProfileEditForm
            initialName={user.name}
            initialAvatarUrl={user.avatarUrl ?? null}
          />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-medium text-slate-800 mb-4">비밀번호 변경</h2>
          <SettingsForm />
        </div>

        {isCEO && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="font-medium text-slate-800 mb-4">팀 · 직원 관리</h2>
            <TeamUserManagement />
          </div>
        )}
      </div>
    </div>
  );
}
