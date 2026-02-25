"use client";

import { useState, useEffect, useCallback } from "react";
import { format, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { ko } from "date-fns/locale";
import TaskDetailModal from "./TaskDetailModal";
import { STATUS_LABELS } from "./ProgressGauge";

type TaskItem = {
  id: string;
  title: string;
  dueDate: string;
  status: string;
  priority: string;
  teamName: string;
};

const PRIORITY_ORDER = { high: 0, normal: 1, low: 2 };

export default function MyTasks() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalTaskId, setModalTaskId] = useState<string | null>(null);

  const fetchTasks = useCallback(() => {
    if (!myId) return;
    setLoading(true);
    fetch(`/api/tasks?userId=${myId}`, { credentials: "include" })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setTasks(json.data);
      })
      .finally(() => setLoading(false));
  }, [myId]);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.data?.id) setMyId(j.data.id);
      });
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const today = format(new Date(), "yyyy-MM-dd");
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  const todayTasks = tasks
    .filter((t) => format(new Date(t.dueDate), "yyyy-MM-dd") === today && t.status !== "done" && t.status !== "cancelled")
    .sort((a, b) => PRIORITY_ORDER[a.priority as keyof typeof PRIORITY_ORDER] - PRIORITY_ORDER[b.priority as keyof typeof PRIORITY_ORDER]);

  const weekTasks = tasks
    .filter(
      (t) =>
        isWithinInterval(new Date(t.dueDate), { start: weekStart, end: weekEnd }) &&
        t.status !== "done" &&
        t.status !== "cancelled"
    )
    .sort(
      (a, b) =>
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime() ||
        PRIORITY_ORDER[a.priority as keyof typeof PRIORITY_ORDER] - PRIORITY_ORDER[b.priority as keyof typeof PRIORITY_ORDER]
    );

  if (!myId) return null;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <h2 className="font-semibold text-slate-800 p-4 border-b border-slate-100">
          오늘 업무
        </h2>
        {loading ? (
          <p className="p-4 text-slate-500 text-sm">로딩 중...</p>
        ) : todayTasks.length === 0 ? (
          <p className="p-4 text-slate-500 text-sm">오늘 마감 업무가 없습니다.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {todayTasks.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setModalTaskId(t.id)}
                  className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <span
                    className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      t.status === "todo"
                        ? "bg-slate-100 text-slate-600"
                        : t.status === "in_progress"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {STATUS_LABELS[t.status] || t.status}
                  </span>
                  <span className="flex-1 font-medium text-slate-800">{t.title}</span>
                  <span className="text-xs text-slate-500">{t.teamName}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <h2 className="font-semibold text-slate-800 p-4 border-b border-slate-100">
          이번 주 업무
        </h2>
        {loading ? (
          <p className="p-4 text-slate-500 text-sm">로딩 중...</p>
        ) : weekTasks.length === 0 ? (
          <p className="p-4 text-slate-500 text-sm">이번 주 업무가 없습니다.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {weekTasks.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setModalTaskId(t.id)}
                  className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <span
                    className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      t.status === "todo"
                        ? "bg-slate-100 text-slate-600"
                        : t.status === "in_progress"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {STATUS_LABELS[t.status] || t.status}
                  </span>
                  <span className="flex-1 font-medium text-slate-800">{t.title}</span>
                  <span className="text-xs text-slate-500">
                    {format(new Date(t.dueDate), "M/d (EEE)", { locale: ko })} · {t.teamName}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {modalTaskId && (
        <TaskDetailModal
          taskId={modalTaskId}
          onClose={() => setModalTaskId(null)}
          onUpdated={() => {
            fetchTasks();
            setModalTaskId(null);
          }}
        />
      )}
    </div>
  );
}
