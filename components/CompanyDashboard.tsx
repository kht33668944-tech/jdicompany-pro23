"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Inbox, PlayCircle, CheckCircle, AlertCircle, TrendingUp, Megaphone } from "lucide-react";
import ProgressGauge from "./ProgressGauge";
import TeamBoard from "./TeamBoard";
import ActivityFeed from "./ActivityFeed";
import TaskListModal from "./TaskListModal";

type Summary = {
  todoCount: number;
  inProgressCount: number;
  doneCount: number;
  overdueCount: number;
  totalActive: number;
  progressPercent: number;
};

type OverdueTask = {
  id: string;
  title: string;
  dueDate: string;
  status: string;
  assigneeName: string;
  teamName: string;
};

type TeamBoardData = {
  teamId: string;
  teamName: string;
  progressPercent: number;
  todoCount: number;
  inProgressCount: number;
  doneCount: number;
  todoTasks: { id: string; title: string; status: string }[];
  inProgressTasks: { id: string; title: string; status: string }[];
  doneTasks: { id: string; title: string; status: string }[];
};

type ActivityItem = {
  type: string;
  userName: string;
  text: string;
  createdAt: string;
};

type RecentAnnouncement = {
  id: string;
  type: string;
  title: string;
  eventDate: string | null;
  createdAt: string;
};

type DashboardData = {
  summary: Summary;
  overdueTasks: OverdueTask[];
  teamBoards: TeamBoardData[];
  activities: ActivityItem[];
};

export default function CompanyDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [recentAnnouncements, setRecentAnnouncements] = useState<RecentAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [listModalStatus, setListModalStatus] = useState<string | null>(null);

  const fetchData = () => {
    Promise.all([
      fetch("/api/dashboard/summary", { credentials: "include" }).then((res) => res.json()),
      fetch("/api/announcements?limit=5", { credentials: "include" }).then((res) => res.json()),
    ])
      .then(([summaryJson, announcementsJson]) => {
        if (summaryJson.success) setData(summaryJson.data);
        else setError(summaryJson.error?.message || "로드 실패");
        if (announcementsJson.success && Array.isArray(announcementsJson.data)) {
          setRecentAnnouncements(
            announcementsJson.data.map((a: { id: string; type: string; title: string; eventDate: Date | null; createdAt: Date }) => ({
              id: a.id,
              type: a.type,
              title: a.title,
              eventDate: a.eventDate ? new Date(a.eventDate).toISOString() : null,
              createdAt: new Date(a.createdAt).toISOString(),
            }))
          );
        }
      })
      .catch(() => setError("네트워크 오류"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-slate-100 rounded-2xl h-28" />
          ))}
        </div>
        <div className="bg-slate-100 rounded-2xl h-40" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-slate-100 rounded-2xl h-64" />
          <div className="bg-slate-100 rounded-2xl h-64" />
        </div>
        <div className="flex items-center justify-center py-8">
          <p className="text-slate-500 text-sm">대시보드 로딩 중...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-red-700">
        <p className="font-medium">잠시 후 다시 시도해 주세요.</p>
        <p className="text-sm mt-1 text-red-600">{error}</p>
        <button
          type="button"
          onClick={() => {
            setError("");
            setLoading(true);
            fetchData();
          }}
          className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-sm font-medium text-red-800 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }
  if (!data) return null;

  const s = data.summary;
  const incompleteCount = s.todoCount + s.inProgressCount;

  return (
    <div className="space-y-8">
      {/* 최근 공지 (최상단) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-slate-500" />
            최근 공지
          </h2>
          <Link
            href="/announcements"
            className="text-sm text-blue-600 hover:underline font-medium"
          >
            더보기 →
          </Link>
        </div>
        {recentAnnouncements.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {recentAnnouncements.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/announcements?highlight=${a.id}`}
                  className="block px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <span className="text-xs text-slate-500 mr-2">
                    {format(new Date(a.createdAt), "M/d", { locale: ko })}
                  </span>
                  <span className="text-slate-700 font-medium">{a.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-6 text-slate-500 text-sm">등록된 공지가 없습니다.</p>
        )}
      </div>

      {/* 한 줄 요약 + 빠른 액션 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-slate-600 text-sm">
          오늘 미완료 <span className="font-semibold text-slate-800">{incompleteCount}</span>건
          {s.overdueCount > 0 && (
            <>
              {" · "}
              연체 <span className="font-semibold text-red-600">{s.overdueCount}</span>건
            </>
          )}
        </p>
        <div className="flex items-center gap-2">
          <Link
            href="/me"
            className="inline-flex items-center justify-center min-h-[44px] gap-1.5 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors touch-manipulation"
          >
            출퇴근 체크
          </Link>
          <Link
            href="/tasks"
            className="inline-flex items-center justify-center min-h-[44px] gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors touch-manipulation"
          >
            할 일 추가
          </Link>
        </div>
      </div>

      {/* 상단 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <button
          type="button"
          onClick={() => setListModalStatus("todo")}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 text-left hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <Inbox className="w-5 h-5" />
            </span>
            <p className="text-sm font-medium text-slate-500">준비중</p>
          </div>
          <p className="text-2xl font-bold text-slate-700 mt-2">{s.todoCount}</p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full bg-slate-400 rounded-full"
              style={{
                width: `${s.totalActive ? (s.todoCount / s.totalActive) * 100 : 0}%`,
              }}
            />
          </div>
        </button>
        <button
          type="button"
          onClick={() => setListModalStatus("in_progress")}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 text-left hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <PlayCircle className="w-5 h-5" />
            </span>
            <p className="text-sm font-medium text-slate-500">진행중</p>
          </div>
          <p className="text-2xl font-bold text-blue-600 mt-2">{s.inProgressCount}</p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{
                width: `${s.totalActive ? (s.inProgressCount / s.totalActive) * 100 : 0}%`,
              }}
            />
          </div>
        </button>
        <button
          type="button"
          onClick={() => setListModalStatus("done")}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 text-left hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle className="w-5 h-5" />
            </span>
            <p className="text-sm font-medium text-slate-500">완료</p>
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{s.doneCount}</p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{
                width: `${s.totalActive ? (s.doneCount / s.totalActive) * 100 : 0}%`,
              }}
            />
          </div>
        </button>
        <button
          type="button"
          onClick={() => setListModalStatus("overdue")}
          className="bg-white rounded-2xl border border-red-100 shadow-sm p-5 text-left hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
              <AlertCircle className="w-5 h-5" />
            </span>
            <p className="text-sm font-medium text-slate-500">지연</p>
          </div>
          <p className="text-2xl font-bold text-red-600 mt-2">{s.overdueCount}</p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full bg-red-500 rounded-full"
              style={{
                width: `${s.totalActive && s.overdueCount ? Math.min((s.overdueCount / s.totalActive) * 100, 100) : 0}%`,
              }}
            />
          </div>
        </button>
        <div className="bg-blue-600 rounded-2xl border border-blue-700 shadow-sm p-5 md:col-span-1 text-white">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </span>
            <p className="text-sm font-medium text-blue-100">전체 진행률</p>
          </div>
          <p className="text-2xl font-bold mt-2">{s.progressPercent}%</p>
          <div className="mt-2 h-2 w-full rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all"
              style={{ width: `${s.progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 전체 진행률 게이지바 (크게) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-semibold text-slate-800 mb-4">전체 업무 진행률</h2>
        <ProgressGauge
          todoCount={s.todoCount}
          inProgressCount={s.inProgressCount}
          doneCount={s.doneCount}
          overdueCount={s.overdueCount}
          progressPercent={s.progressPercent}
          height="lg"
          showLegend={true}
        />
      </div>

      {/* 팀별 진행 보드 */}
      <div>
        <h2 className="font-semibold text-slate-800 mb-4">팀별 진행 보드</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.teamBoards.map((team) => (
            <TeamBoard
              key={team.teamId}
              team={team}
              teamHref={`/teams/${team.teamId}`}
              onTaskUpdated={fetchData}
            />
          ))}
        </div>
      </div>

      {listModalStatus && (
        <TaskListModal
          initialStatus={listModalStatus}
          onClose={() => setListModalStatus(null)}
        />
      )}

      {/* 지연 업무 */}
      {data.overdueTasks.length > 0 && (
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">지연 업무</h2>
            <Link
              href="/tasks"
              className="text-sm text-blue-600 hover:underline font-medium"
            >
              할 일 보기 →
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {data.overdueTasks.slice(0, 10).map((t) => (
              <li key={t.id} className="px-4 py-3 flex items-center justify-between">
                <span className="text-slate-700 font-medium">{t.title}</span>
                <span className="text-xs text-slate-500">
                  마감 {format(new Date(t.dueDate), "M/d", { locale: ko })} · {t.teamName} · {t.assigneeName}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 최근 활동 */}
      <ActivityFeed items={data.activities} />
    </div>
  );
}
