import { getSession } from "@/lib/auth";
import CalendarView from "@/components/CalendarView";

export default async function CalendarPage() {
  const session = await getSession();
  if (!session) return null;

  const isCEO = session.role === "CEO";
  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-xl font-semibold text-slate-800 mb-4">캘린더</h1>
      <CalendarView isCEO={isCEO} />
    </div>
  );
}
