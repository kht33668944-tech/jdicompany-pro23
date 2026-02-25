"use client";

import { useState, useEffect } from "react";
import { format, startOfWeek, endOfMonth } from "date-fns";
import { ko } from "date-fns/locale";
import Link from "next/link";

type Task = { id: string; title: string; dueDate: string; status: string; assigneeName: string; projectName: string | null };
type Event = { id: string; title: string; startAt: string; endAt: string; assigneeName: string };
type Leave = { id: string; userName: string; startDate: string; endDate: string; status: string };

export default function TeamScheduleCard({
  teamId,
  from,
  to,
  topTasks = 5,
}: {
  teamId: string;
  from?: Date;
  to?: Date;
  topTasks?: number;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fromStr = (from || startOfWeek(new Date(), { weekStartsOn: 1 })).toISOString().slice(0, 10);
  const toStr = (to || endOfMonth(new Date())).toISOString().slice(0, 10);

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`/api/teams/${teamId}/schedule?from=${fromStr}&to=${toStr}`, { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          setTasks(j.data.tasks || []);
          setEvents(j.data.events || []);
          setLeaves(j.data.leaveRequests || []);
        } else {
          setError(j.error?.message || "로드 실패");
        }
      })
      .catch(() => setError("네트워크 오류"))
      .finally(() => setLoading(false));
  }, [teamId, fromStr, toStr]);

  if (loading) return <div className="rounded-2xl border border-slate-200 p-4 text-slate-500 text-sm">로딩 중...</div>;
  if (error) return <div className="rounded-2xl border border-red-100 p-4 text-red-600 text-sm">{error}</div>;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <h2 className="font-semibold text-slate-800 p-4 border-b border-slate-100">팀 스케줄</h2>
      <div className="p-4 space-y-4">
        <div>
          <h3 className="text-sm font-medium text-slate-600 mb-2">이번 주 마감 업무 (상위 {topTasks}건)</h3>
          {tasks.length === 0 ? (
            <p className="text-sm text-slate-500">없음</p>
          ) : (
            <ul className="space-y-1">
              {tasks.slice(0, topTasks).map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/teams/${teamId}`}
                    className="text-sm text-slate-700 hover:text-blue-600 hover:underline line-clamp-2"
                    title={t.title}
                  >
                    {t.title}
                  </Link>
                  <span className="text-xs text-slate-500 ml-2">
                    {format(new Date(t.dueDate), "M/d", { locale: ko })} · {t.assigneeName}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="text-sm font-medium text-slate-600 mb-2">팀 연차 (승인/대기)</h3>
          {leaves.length === 0 ? (
            <p className="text-sm text-slate-500">없음</p>
          ) : (
            <ul className="space-y-1">
              {leaves.map((l) => (
                <li key={l.id} className="text-sm text-slate-700">
                  <span className={l.status === "approved" ? "text-emerald-600" : "text-amber-600"}>
                    {l.userName}
                  </span>
                  <span className="text-slate-500 ml-2">
                    {format(new Date(l.startDate), "M/d", { locale: ko })} ~ {format(new Date(l.endDate), "M/d", { locale: ko })}
                    {l.status === "pending" && " (대기)"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="text-sm font-medium text-slate-600 mb-2">팀 일정</h3>
          {events.length === 0 ? (
            <p className="text-sm text-slate-500">없음</p>
          ) : (
            <ul className="space-y-1">
              {events.slice(0, 5).map((e) => (
                <li key={e.id} className="text-sm text-slate-700">
                  {e.title}
                  <span className="text-slate-500 ml-2">
                    {format(new Date(e.startAt), "M/d HH:mm", { locale: ko })} · {e.assigneeName}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
