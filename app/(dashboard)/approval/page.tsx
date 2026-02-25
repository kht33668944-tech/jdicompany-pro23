import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ApprovalList from "@/components/ApprovalList";

export default async function ApprovalPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
  });
  if (!user || user.role !== "CEO") redirect("/dashboard");

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold text-slate-800 mb-4">가입 승인</h1>
      <p className="text-slate-600 text-sm mb-6">
        회원가입 후 승인 대기 중인 사용자를 승인할 수 있습니다.
      </p>
      <ApprovalList />
    </div>
  );
}
