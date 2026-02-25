import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import MeKanban from "@/components/MeKanban";
import LeaveRequestForm from "@/components/LeaveRequestForm";
import AttendanceButtons from "@/components/AttendanceButtons";
import LeaveApprovalCard from "@/components/LeaveApprovalCard";

export default async function MePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const isCEO = session.role === "CEO";

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <h1 className="text-xl font-semibold text-slate-800">내 업무</h1>

      {isCEO && (
        <section>
          <LeaveApprovalCard />
        </section>
      )}

      <section className="grid md:grid-cols-2 gap-6">
        <AttendanceButtons />
        <LeaveRequestForm />
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <MeKanban />
      </section>
    </div>
  );
}
