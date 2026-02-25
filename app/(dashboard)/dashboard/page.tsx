import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import CompanyDashboard from "@/components/CompanyDashboard";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-xl font-semibold text-slate-800 mb-6">대시보드</h1>
      <CompanyDashboard />
    </div>
  );
}
