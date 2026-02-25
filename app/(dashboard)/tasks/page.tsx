import { getSession } from "@/lib/auth";
import TodayTasks from "@/components/TodayTasks";

export default async function TasksPage() {
  const session = await getSession();
  if (!session) return null;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold text-slate-800 mb-4">오늘 할 일</h1>
      <TodayTasks />
    </div>
  );
}
