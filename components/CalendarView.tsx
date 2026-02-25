"use client";

import { useState, useEffect, useCallback } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  addDays,
  isWithinInterval,
} from "date-fns";
import { ko } from "date-fns/locale";
import { STATUS_COLORS, STATUS_LABELS } from "./ProgressGauge";
import TaskDetailModal from "./TaskDetailModal";

type EventItem = {
  id: string;
  title: string;
  description?: string | null;
  start: string;
  end: string;
  assigneeId?: string | null;
  teamName: string | null;
  assigneeName: string | null;
  status: string;
  isAnnouncement?: boolean;
};

type TaskItem = {
  id: string;
  title: string;
  dueDate: string;
  status: string;
  assigneeName: string;
  teamName: string;
};

type LeaveItem = {
  id: string;
  userId: string;
  userName: string;
  startDate: string;
  endDate: string;
  status: string;
};

type UserOption = { id: string; name: string; teamId: string | null; teamName: string | null };

type CalendarViewProps = { isCEO: boolean };

export default function CalendarView({ isCEO }: CalendarViewProps) {
  const [current, setCurrent] = useState(new Date());
  const [events, setEvents] = useState<EventItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [modalEvent, setModalEvent] = useState<EventItem | null>(null);
  const [modalDate, setModalDate] = useState<Date | null>(null);
  const [modalTaskId, setModalTaskId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const year = current.getFullYear();
  const month = current.getMonth();

  useEffect(() => {
    setLoading(true);
    const start = startOfMonth(new Date(year, month, 1));
    const end = endOfMonth(new Date(year, month, 1));
    const eventParams = new URLSearchParams({
      start: start.toISOString(),
      end: end.toISOString(),
    });
    if (isCEO && teamFilter) eventParams.set("teamId", teamFilter);
    if (isCEO && userFilter) eventParams.set("userId", userFilter);
    const taskParams = new URLSearchParams({
      from: format(start, "yyyy-MM-dd"),
      to: format(end, "yyyy-MM-dd"),
    });
    if (statusFilter) taskParams.set("status", statusFilter);
    if (teamFilter) taskParams.set("teamId", teamFilter);
    if (userFilter) taskParams.set("userId", userFilter);

    const pEvents = fetch(`/api/events?${eventParams}`, { credentials: "include" })
      .then((res) => res.json())
      .then((json) => (json.success ? json.data : []))
      .catch((err) => {
        console.error("Calendar events fetch failed", err);
        return [];
      });
    const pTasks = fetch(`/api/tasks?${taskParams}`, { credentials: "include" })
      .then((res) => res.json())
      .then((json) => (json.success ? json.data : []))
      .catch((err) => {
        console.error("Calendar tasks fetch failed", err);
        return [];
      });
    const pLeaves = fetch("/api/leave", { credentials: "include" })
      .then((res) => res.json())
      .then((json) => (json.success ? (json.data as LeaveItem[]).filter((l) => l.status === "approved") : []))
      .catch((err) => {
        console.error("Calendar leave fetch failed", err);
        return [];
      });

    Promise.all([pEvents, pTasks, pLeaves])
      .then(([ev, t, l]) => {
        setEvents(ev);
        setTasks(t);
        setLeaves(l);
      })
      .catch((err) => {
        console.error("Calendar fetch failed", err);
      })
      .finally(() => setLoading(false));
  }, [year, month, isCEO, statusFilter, teamFilter, userFilter, refreshKey]);

  useEffect(() => {
    fetch("/api/teams", { credentials: "include" })
      .then((res) => res.json())
      .then((json) => { if (json.success) setTeams(json.data); });
    fetch("/api/users", { credentials: "include" })
      .then((res) => res.json())
      .then((json) => {
        if (json.success)
          setUsers((json.data as (UserOption & { role?: string })[]).filter((u) => u.teamId));
      });
  }, []);

  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days: Date[] = [];
  let d = calStart;
  while (d <= calEnd) {
    days.push(d);
    d = addDays(d, 1);
  }

  const getEventsForDay = (day: Date) =>
    events.filter((e) => {
      if (e.isAnnouncement) return isSameDay(new Date(e.start), day);
      const start = new Date(e.start);
      const end = new Date(e.end);
      return isWithinInterval(day, { start, end }) || isSameDay(start, day);
    });

  const getTasksForDay = (day: Date) =>
    tasks.filter((t) => isSameDay(new Date(t.dueDate), day));

  const getLeavesForDay = (day: Date) =>
    leaves.filter((l) => {
      const start = new Date(l.startDate);
      const end = new Date(l.endDate);
      return isWithinInterval(day, { start, end }) || isSameDay(start, day) || isSameDay(end, day);
    });

  const weekDays = ["월", "화", "수", "목", "금", "토", "일"];

  const openNewEvent = (day: Date) => {
    setModalDate(day);
    setModalEvent(null);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setCurrent(subMonths(current, 1))} className="p-2 rounded-xl hover:bg-slate-100">
            ◀
          </button>
          <span className="font-semibold text-slate-800 min-w-[140px] text-center">
            {format(current, "yyyy년 M월", { locale: ko })}
          </span>
          <button type="button" onClick={() => setCurrent(addMonths(current, 1))} className="p-2 rounded-xl hover:bg-slate-100">
            ▶
          </button>
        </div>
        <button type="button" onClick={() => setCurrent(new Date())} className="text-sm text-blue-600 hover:underline font-medium">
          오늘
        </button>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-slate-300 rounded-xl px-3 py-1.5"
        >
          <option value="">상태 전체</option>
          <option value="todo">준비중</option>
          <option value="in_progress">진행중</option>
          <option value="done">완료</option>
          <option value="on_hold">보류</option>
        </select>
        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="text-sm border border-slate-300 rounded-xl px-3 py-1.5"
        >
          <option value="">팀 전체</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          className="text-sm border border-slate-300 rounded-xl px-3 py-1.5"
        >
          <option value="">담당자 전체</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name} ({u.teamName ?? "-"})</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500">로딩 중...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[700px]">
            <thead>
              <tr>
                {weekDays.map((w) => (
                  <th key={w} className="border border-slate-200 p-2 text-sm font-medium text-slate-600 bg-slate-50">
                    {w}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.ceil(days.length / 7) }, (_, i) => days.slice(i * 7, i * 7 + 7)).map((row, rowIdx) => (
                <tr key={rowIdx}>
                  {row.map((day) => {
                    const dayEvents = getEventsForDay(day);
                    const dayTasks = getTasksForDay(day);
                    const dayLeaves = getLeavesForDay(day);
                    const isCurrentMonth = isSameMonth(day, current);
                    const isToday = isSameDay(day, new Date());
                    return (
                      <td
                        key={day.toISOString()}
                        className={`border border-slate-200 align-top p-1.5 min-h-[120px] ${
                          !isCurrentMonth ? "bg-slate-50" : "bg-white"
                        } ${isToday ? "ring-2 ring-blue-400 ring-inset" : ""}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-medium ${isCurrentMonth ? "text-slate-800" : "text-slate-400"}`}>
                            {format(day, "d")}
                          </span>
                          <button
                            type="button"
                            onClick={() => openNewEvent(day)}
                            className="text-slate-400 hover:text-blue-600 text-xs"
                          >
                            + 일정
                          </button>
                        </div>
                        <div className="space-y-1.5">
                          {dayEvents.slice(0, 2).map((ev) => (
                            <button
                              key={ev.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setModalEvent(ev);
                                setModalDate(null);
                              }}
                              className={`w-full text-left rounded-lg border px-2 py-1.5 text-xs flex items-center gap-1.5 ${
                                ev.isAnnouncement
                                  ? "border-amber-200 bg-amber-50/80 hover:bg-amber-100"
                                  : "border-blue-200 bg-blue-50/80 hover:bg-blue-100"
                              }`}
                            >
                              <span className={ev.isAnnouncement ? "text-amber-600" : "text-blue-600"} title={ev.isAnnouncement ? "공지" : "회사일정"}>
                                {ev.isAnnouncement ? "📢" : "📅"}
                              </span>
                              <span className="truncate flex-1">{ev.title}</span>
                              {!ev.isAnnouncement && isCEO && ev.assigneeName && <span className="text-blue-500 shrink-0">{ev.assigneeName}</span>}
                            </button>
                          ))}
                          {dayTasks.slice(0, 3).map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setModalTaskId(t.id);
                              }}
                              className="w-full text-left rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs hover:bg-slate-50 flex items-center gap-1.5"
                            >
                              <span
                                className={`w-1 min-h-[20px] rounded-full flex-shrink-0 self-stretch ${STATUS_COLORS[t.status] || "bg-slate-400"}`}
                              />
                              <span className={`shrink-0 px-1 py-0.5 rounded text-[10px] ${t.status === "todo" ? "bg-slate-100 text-slate-600" : t.status === "in_progress" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}>
                                {STATUS_LABELS[t.status] || t.status}
                              </span>
                              <span className="truncate flex-1">{t.title}</span>
                            </button>
                          ))}
                          {dayLeaves.slice(0, 2).map((l) => (
                            <div
                              key={`${l.id}-${format(day, "yyyy-MM-dd")}`}
                              className="rounded-lg border border-amber-200 bg-amber-50/80 px-2 py-1.5 text-xs flex items-center gap-1.5"
                            >
                              <span className="text-amber-600" title="연차">🏖️</span>
                              <span className="truncate flex-1">{l.userName} 연차</span>
                            </div>
                          ))}
                          {(dayEvents.length > 2 || dayTasks.length > 3 || dayLeaves.length > 2) && (
                            <p className="text-[10px] text-slate-400 px-1">
                              +{Math.max(0, dayEvents.length - 2) + Math.max(0, dayTasks.length - 3) + Math.max(0, dayLeaves.length - 2)}건
                            </p>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(modalEvent || modalDate) && (
        <EventModal
          event={modalEvent}
          date={modalDate}
          isCEO={isCEO}
          users={users}
          onClose={() => { setModalEvent(null); setModalDate(null); }}
          onSaved={() => {
            setRefreshKey((k) => k + 1);
            setModalEvent(null);
            setModalDate(null);
          }}
        />
      )}
      {modalTaskId && (
        <TaskDetailModal
          taskId={modalTaskId}
          onClose={() => setModalTaskId(null)}
          onUpdated={() => {
            setRefreshKey((k) => k + 1);
            setModalTaskId(null);
          }}
        />
      )}
    </div>
  );
}

function EventModal({
  event,
  date,
  isCEO,
  users,
  onClose,
  onSaved,
}: {
  event: EventItem | null;
  date: Date | null;
  isCEO: boolean;
  users: UserOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [start, setStart] = useState(
    event ? format(new Date(event.start), "yyyy-MM-dd'T'HH:mm") : date ? format(date, "yyyy-MM-dd'T'09:00") : ""
  );
  const [end, setEnd] = useState(
    event ? format(new Date(event.end), "yyyy-MM-dd'T'HH:mm") : date ? format(date, "yyyy-MM-dd'T'10:00") : ""
  );
  const [assigneeId, setAssigneeId] = useState(event?.assigneeId ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!title.trim()) { setError("제목을 입력해주세요."); return; }
    if (!start || !end) { setError("시작·종료 시간을 입력해주세요."); return; }
    if (new Date(end) <= new Date(start)) { setError("종료 시간이 시작 시간보다 이후여야 합니다."); return; }
    if (isCEO && !event && !assigneeId) { setError("담당자를 선택해주세요."); return; }
    setSaving(true);
    try {
      const url = event ? `/api/events/${event.id}` : "/api/events";
      const method = event ? "PUT" : "POST";
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: (description as string)?.trim() || undefined,
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
      };
      const selected = users.find((u) => u.id === assigneeId);
      if (isCEO && assigneeId && selected?.teamId) {
        body.assigneeId = assigneeId;
        body.teamId = selected.teamId;
      }
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) onSaved();
      else setError(json.error?.message || "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!event || event.isAnnouncement) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${event.id}`, { method: "DELETE", credentials: "include" });
      const json = await res.json();
      if (json.success) onSaved();
      else setError(json.error?.message || "삭제에 실패했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">{event ? "일정 수정" : "새 일정"}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">제목 *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-xl" required placeholder="일정 제목" />
          </div>
          {isCEO && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">담당자 *</label>
              <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-xl" required={!event} disabled={!!event}>
                <option value="">선택</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.teamName ?? "-"})</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">시작 *</label>
            <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-xl" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">종료 *</label>
            <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-xl" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">설명 (선택)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-xl resize-none" rows={2} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"> {saving ? "저장 중..." : "저장"} </button>
            {event && !event.isAnnouncement && (
              <button type="button" onClick={handleDelete} disabled={deleting} className="px-4 py-2 border border-red-300 text-red-600 rounded-xl hover:bg-red-50 disabled:opacity-50"> 삭제 </button>
            )}
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-50"> 취소 </button>
          </div>
        </form>
      </div>
    </div>
  );
}
