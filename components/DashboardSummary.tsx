"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

type Summary = {
  todayEventCount: number;
  weekEventCount: number;
  weekNewTaskCount: number;
  inProgressTaskCount: number;
  doneTaskCount: number;
  totalTaskCount: number;
  taskCompletionRate: number;
  overdueTaskCount: number;
  overdueTasks: { id: string; title: string; dueDate: string; status: string; assigneeName: string; teamName: string }[];
  byTeam: {
    teamId: string;
    teamName: string;
    weekEventCount: number;
    taskTotal: number;
    taskDone: number;
    progressPercent: number;
  }[];
  todayEvents: { id: string; title: string; start: string; assigneeName: string; teamName: string }[];
  recentAnnouncements: { id: string; title: string; eventDate: string | null; createdAt: string }[];
};

export default function DashboardSummary() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/dashboard/summary", { credentials: "include" })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setData(json.data);
        else setError(json.error?.message || "로드 실패");
      })
      .catch(() => setError("네트워크 오류"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-slate-500">로딩 중...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-sm text-slate-500">오늘 일정</p>
          <p className="text-2xl font-bold text-slate-800">{data.todayEventCount}건</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-sm text-slate-500">이번 주 일정</p>
          <p className="text-2xl font-bold text-slate-800">{data.weekEventCount}건</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-sm text-slate-500">이번 주 신규 업무</p>
          <p className="text-2xl font-bold text-slate-800">{data.weekNewTaskCount}건</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-sm text-slate-500">진행중 / 완료</p>
          <p className="text-2xl font-bold text-slate-800">{data.inProgressTaskCount} / {data.doneTaskCount}건</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-sm text-slate-500">완료율 · 지연</p>
          <p className="text-2xl font-bold text-slate-800">{data.taskCompletionRate}%</p>
          <p className="text-xs text-red-600 mt-1">지연 {data.overdueTaskCount}건</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <h2 className="font-medium text-slate-800 mb-3">팀별 업무 진행률</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {data.byTeam.map((t) => (
            <div key={t.teamId} className="border border-slate-100 rounded-lg p-3">
              <p className="font-medium text-slate-700">{t.teamName}</p>
              <p className="text-sm text-slate-500">
                이번 주 일정 {t.weekEventCount}건 · 할 일 {t.taskDone}/{t.taskTotal}건
              </p>
              <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${t.progressPercent}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">{t.progressPercent}%</p>
            </div>
          ))}
        </div>
      </div>

      {data.overdueTasks.length > 0 && (
        <div className="bg-white rounded-xl border border-red-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-slate-800">지연 업무</h2>
            <Link href="/tasks" className="text-sm text-blue-600 hover:underline">
              할 일 →
            </Link>
          </div>
          <ul className="space-y-2">
            {data.overdueTasks.slice(0, 8).map((t) => (
              <li key={t.id} className="flex justify-between text-sm items-center">
                <span className="text-slate-700">{t.title}</span>
                <span className="text-slate-500 text-xs">
                  마감 {format(new Date(t.dueDate), "M/d", { locale: ko })} · {t.teamName} {t.assigneeName}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-slate-800">오늘의 전사 일정</h2>
            <Link href="/calendar" className="text-sm text-blue-600 hover:underline">
              캘린더 →
            </Link>
          </div>
          <ul className="space-y-2">
            {data.todayEvents.length === 0 ? (
              <li className="text-slate-500 text-sm">오늘 일정이 없습니다.</li>
            ) : (
              data.todayEvents.slice(0, 8).map((e) => (
                <li key={e.id} className="flex justify-between text-sm">
                  <span className="text-slate-700">
                    {format(new Date(e.start), "HH:mm", { locale: ko })} {e.title}
                  </span>
                  <span className="text-slate-500">
                    {e.teamName} · {e.assigneeName}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <h2 className="font-medium text-slate-800 mb-3">최근 공지</h2>
          <ul className="space-y-2">
            {data.recentAnnouncements.length === 0 ? (
              <li className="text-slate-500 text-sm">공지가 없습니다.</li>
            ) : (
              data.recentAnnouncements.map((a) => (
                <li key={a.id} className="text-sm">
                  <span className="text-slate-700">{a.title}</span>
                  <span className="text-slate-400 ml-2">
                    {format(new Date(a.createdAt), "M/d", { locale: ko })}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
