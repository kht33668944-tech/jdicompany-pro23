"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import TaskDetailModal from "./TaskDetailModal";

type TaskItem = {
  id: string;
  title: string;
  description?: string | null;
  dueDate: string;
  status: string;
  priority: string;
  assigneeName: string;
  teamName: string;
  createdBy?: string;
  createdAt: string;
};

type Team = { id: string; name: string };
type User = { id: string; name: string; teamName: string | null };

const STATUS_LABEL: Record<string, string> = {
  todo: "할 일",
  in_progress: "진행중",
  done: "완료",
  on_hold: "보류",
  cancelled: "취소",
};

const STATUS_CLASS: Record<string, string> = {
  todo: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-100 text-blue-800",
  done: "bg-green-100 text-green-800",
  on_hold: "bg-amber-100 text-amber-800",
  cancelled: "bg-slate-50 text-slate-500",
};

const PRIORITY_LABEL: Record<string, string> = {
  high: "높음",
  normal: "보통",
  low: "낮음",
};

const PRIORITY_CLASS: Record<string, string> = {
  high: "bg-red-100 text-red-800",
  normal: "bg-slate-100 text-slate-700",
  low: "bg-slate-50 text-slate-500",
};

export default function TodayTasks() {
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [statusFilter, setStatusFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState("normal");
  const [newDescription, setNewDescription] = useState("");
  const [adding, setAdding] = useState(false);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isCEO, setIsCEO] = useState(false);

  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    if (selectedDate) params.set("date", selectedDate);
    if (statusFilter) params.set("status", statusFilter);
    if (teamFilter) params.set("teamId", teamFilter);
    if (priorityFilter) params.set("priority", priorityFilter);
    if (searchQ.trim()) params.set("q", searchQ.trim());
    return params.toString();
  }, [selectedDate, statusFilter, teamFilter, priorityFilter, searchQ]);

  const fetchTasks = useCallback(() => {
    setLoading(true);
    const query = buildParams();
    fetch(`/api/tasks${query ? `?${query}` : ""}`, { credentials: "include" })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setTasks(json.data);
      })
      .finally(() => setLoading(false));
  }, [buildParams]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.data?.role === "CEO") {
          setIsCEO(true);
          fetch("/api/teams", { credentials: "include" })
            .then((r) => r.json())
            .then((j2) => { if (j2.success) setTeams(j2.data); });
          fetch("/api/users", { credentials: "include" })
            .then((r) => r.json())
            .then((j2) => { if (j2.success) setUsers(j2.data); });
        }
      });
  }, []);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: newTitle.trim(),
          dueDate: selectedDate,
          priority: newPriority,
          description: newDescription.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setNewTitle("");
        setNewDescription("");
        fetchTasks();
      }
    } finally {
      setAdding(false);
    }
  }

  const isToday = selectedDate === format(new Date(), "yyyy-MM-dd");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-slate-700">날짜</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg"
        />
        {!isToday && (
          <button
            type="button"
            onClick={() => setSelectedDate(format(new Date(), "yyyy-MM-dd"))}
            className="min-h-[44px] px-3 flex items-center text-sm text-blue-600 hover:underline touch-manipulation"
          >
            오늘로
          </button>
        )}
        <label className="text-sm font-medium text-slate-700 ml-2">상태</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-2 py-2 border border-slate-300 rounded-lg text-sm"
        >
          <option value="">전체</option>
          <option value="todo">할 일</option>
          <option value="in_progress">진행중</option>
          <option value="done">완료</option>
          <option value="on_hold">보류</option>
          <option value="cancelled">취소</option>
        </select>
        {isCEO && (
          <>
            <label className="text-sm font-medium text-slate-700">팀</label>
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="px-2 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="">전체</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </>
        )}
        <label className="text-sm font-medium text-slate-700">우선순위</label>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-2 py-2 border border-slate-300 rounded-lg text-sm"
        >
          <option value="">전체</option>
          <option value="high">높음</option>
          <option value="normal">보통</option>
          <option value="low">낮음</option>
        </select>
        <input
          type="text"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder="제목 검색"
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-32"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <h2 className="font-medium text-slate-800 mb-3">
          {selectedDate
            ? `${format(new Date(selectedDate), "M월 d일 (EEE)", { locale: ko })} 할 일`
            : "전체 할 일"}
        </h2>
        <form onSubmit={addTask} className="flex flex-wrap gap-2 mb-4">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="새 할 일 제목"
            className="flex-1 min-w-[160px] px-3 py-2 border border-slate-300 rounded-lg"
          />
          <input
            type="text"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="설명 (선택)"
            className="flex-1 min-w-[160px] px-3 py-2 border border-slate-300 rounded-lg"
          />
          <select
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value)}
            className="px-2 py-2 border border-slate-300 rounded-lg text-sm"
          >
            <option value="high">높음</option>
            <option value="normal">보통</option>
            <option value="low">낮음</option>
          </select>
          <button
            type="submit"
            disabled={adding || !newTitle.trim()}
            className="min-h-[44px] px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium touch-manipulation"
          >
            추가
          </button>
        </form>

        {loading ? (
          <p className="text-slate-500 text-sm">로딩 중...</p>
        ) : tasks.length === 0 ? (
          <p className="text-slate-500 text-sm">조건에 맞는 할 일이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-3 min-h-[44px] py-2 px-3 rounded-lg border bg-white border-slate-200 hover:bg-slate-50"
              >
                <button
                  type="button"
                  onClick={() => setDetailTaskId(t.id)}
                  className="flex-1 text-left flex items-center gap-2 min-h-[44px] touch-manipulation"
                >
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${STATUS_CLASS[t.status] ?? STATUS_CLASS.todo}`}
                  >
                    {STATUS_LABEL[t.status] ?? t.status}
                  </span>
                  <span className={t.status === "done" ? "text-slate-400 line-through" : "text-slate-800"}>
                    {t.title}
                  </span>
                  <span className="text-xs text-slate-500">
                    마감 {format(new Date(t.dueDate), "M/d", { locale: ko })}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ${PRIORITY_CLASS[t.priority] ?? PRIORITY_CLASS.normal}`}>
                    {PRIORITY_LABEL[t.priority] ?? "보통"}
                  </span>
                  <span className="text-xs text-slate-400">{t.teamName} · {t.assigneeName}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {detailTaskId && (
        <TaskDetailModal
          taskId={detailTaskId}
          onClose={() => setDetailTaskId(null)}
          onUpdated={fetchTasks}
        />
      )}
    </div>
  );
}
