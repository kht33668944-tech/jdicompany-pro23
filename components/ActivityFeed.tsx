"use client";

import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

type ActivityItem = {
  type: string;
  userName: string;
  text: string;
  createdAt: string;
};

export default function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-semibold text-slate-800 mb-4">최근 활동</h2>
        <p className="text-sm text-slate-500">아직 활동이 없습니다.</p>
      </div>
    );
  }

  const icon = (type: string) => {
    switch (type) {
      case "task_history":
        return "📌";
      case "leave":
        return "🏖️";
      case "attendance":
        return "🕐";
      default:
        return "•";
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <h2 className="font-semibold text-slate-800 p-4 pb-2">최근 활동</h2>
      <ul className="divide-y divide-slate-100">
        {items.map((a, i) => (
          <li key={i} className="px-4 py-3 flex items-start gap-3">
            <span className="text-lg flex-shrink-0">{icon(a.type)}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-700">
                <span className="font-medium text-slate-800">{a.userName}</span>
                <span className="mx-1">→</span>
                <span>{a.text}</span>
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {formatDistanceToNow(new Date(a.createdAt), {
                  addSuffix: true,
                  locale: ko,
                })}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
