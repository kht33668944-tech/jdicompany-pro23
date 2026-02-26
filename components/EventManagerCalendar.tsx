"use client";

import { useState, useCallback, useMemo, useEffect, Fragment } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  addMonths,
  format,
  isSameDay,
} from "date-fns";
import { ko } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  Clock,
  LayoutGrid,
  List,
  Search,
  Filter,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type CalendarEventView = {
  id: string;
  title: string;
  description?: string | null;
  startTime: Date;
  endTime: Date;
  color: string;
  category?: string;
  isAnnouncement?: boolean;
  isLeave?: boolean;
  assigneeId?: string | null;
  teamId?: string | null;
  assigneeName?: string | null;
  assigneeAvatarUrl?: string | null;
  teamName?: string | null;
};

type ApiEvent = {
  id: string;
  title: string;
  description?: string | null;
  start: string;
  end: string;
  assigneeId?: string | null;
  assigneeName?: string | null;
  assigneeAvatarUrl?: string | null;
  teamId?: string | null;
  teamName?: string | null;
  status?: string;
  category?: string | null;
  color?: string | null;
  isAnnouncement?: boolean;
};

type LeaveItem = {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string | null;
  startDate: string;
  endDate: string;
  reason?: string | null;
  status: string;
};

type UserOption = { id: string; name: string; teamId: string | null; teamName: string | null };

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  blue: { bg: "bg-blue-500", text: "text-blue-700" },
  green: { bg: "bg-green-500", text: "text-green-700" },
  purple: { bg: "bg-purple-500", text: "text-purple-700" },
  orange: { bg: "bg-orange-500", text: "text-orange-700" },
  pink: { bg: "bg-pink-500", text: "text-pink-700" },
  red: { bg: "bg-red-500", text: "text-red-700" },
  slate: { bg: "bg-slate-500", text: "text-slate-700" },
  amber: { bg: "bg-amber-500", text: "text-amber-700" },
};

const STATUS_TO_COLOR: Record<string, string> = {
  scheduled: "blue",
  in_progress: "green",
  done: "purple",
  cancelled: "slate",
};

function apiToView(api: ApiEvent): CalendarEventView {
  const startTime = new Date(api.start);
  const endTime = new Date(api.end);
  const color = api.color && COLOR_MAP[api.color]
    ? api.color
    : api.isAnnouncement
      ? "slate"
      : (api.status ? STATUS_TO_COLOR[api.status] ?? "blue" : "blue");
  const category = api.category ?? (api.isAnnouncement ? "전체 공지" : api.teamName ?? "일정");
  return {
    id: api.id,
    title: api.title,
    description: api.description,
    startTime,
    endTime,
    color,
    category,
    isAnnouncement: api.isAnnouncement,
    assigneeId: api.assigneeId,
    teamId: api.teamId,
    assigneeName: api.assigneeName,
    assigneeAvatarUrl: api.assigneeAvatarUrl ?? null,
    teamName: api.teamName,
  };
}

function leaveToViewItems(leave: LeaveItem): CalendarEventView[] {
  const start = new Date(leave.startDate);
  const end = new Date(leave.endDate);
  const views: CalendarEventView[] = [];
  const d = new Date(start);
  d.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(23, 59, 59, 999);
  while (d <= endDay) {
    const dayStart = new Date(d);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(d);
    dayEnd.setHours(23, 59, 59, 999);
    views.push({
      id: `leave-${leave.id}-${d.getTime()}`,
      title: `${leave.userName} 연차`,
      description: leave.reason ?? undefined,
      startTime: dayStart,
      endTime: dayEnd,
      color: "amber",
      category: "연차",
      isLeave: true,
      assigneeId: leave.userId,
      assigneeName: leave.userName,
      assigneeAvatarUrl: leave.userAvatarUrl ?? null,
      teamId: null,
      teamName: null,
    });
    d.setDate(d.getDate() + 1);
  }
  return views;
}

export default function EventManagerCalendar({ isCEO }: { isCEO: boolean }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "day" | "list">("month");
  const [events, setEvents] = useState<CalendarEventView[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventView | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>("");
  const [filterOpen, setFilterOpen] = useState<"color" | "category" | null>(null);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);

  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formAssigneeId, setFormAssigneeId] = useState("");
  const [formCategory, setFormCategory] = useState("팀 일정");
  const [formColor, setFormColor] = useState("blue");
  const [formError, setFormError] = useState("");
  const [formSaving, setFormSaving] = useState(false);
  const [formDeleting, setFormDeleting] = useState(false);

  const fetchRange = useMemo(() => {
    if (view === "month") {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      return { start, end };
    }
    if (view === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = endOfWeek(currentDate, { weekStartsOn: 0 });
      return { start, end };
    }
    if (view === "day") {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
      const end = addDays(start, 1);
      return { start, end };
    }
    const start = startOfMonth(addMonths(currentDate, -1));
    const end = endOfMonth(addMonths(currentDate, 1));
    return { start, end };
  }, [view, currentDate]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        start: fetchRange.start.toISOString(),
        end: fetchRange.end.toISOString(),
      });
      const [eventsRes, leaveRes] = await Promise.all([
        fetch(`/api/events?${params}`, { credentials: "include" }),
        fetch(`/api/leave?${params}`, { credentials: "include" }),
      ]);
      const eventsJson = await eventsRes.json();
      const leaveJson = await leaveRes.json();
      const list: ApiEvent[] = eventsJson.success ? eventsJson.data ?? [] : [];
      const leaveList: LeaveItem[] = leaveJson.success ? leaveJson.data ?? [] : [];
      const eventViews = list.map(apiToView);
      const leaveViews = leaveList.flatMap(leaveToViewItems);
      setEvents([...eventViews, ...leaveViews]);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [fetchRange.start.toISOString(), fetchRange.end.toISOString()]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    fetch("/api/teams", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => j.success && setTeams(j.data ?? []));
    fetch("/api/users", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (j.success && Array.isArray(j.data)) {
          const list = j.data.filter((u: UserOption & { teamId?: string }) => u.teamId);
          setUsers(list);
          if (list.length === 0) {
            fetch("/api/auth/me", { credentials: "include" })
              .then((res) => res.json())
              .then((j) => {
                const me = j.success ? j.data : null;
                if (me?.id) setUsers([{ id: me.id, name: me.name ?? me.username ?? "나", teamId: me.teamId ?? null, teamName: me.teamName ?? null }]);
              });
          }
        }
      });
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (selectedAssigneeId && ev.assigneeId !== selectedAssigneeId) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !ev.title.toLowerCase().includes(q) &&
          !ev.description?.toLowerCase().includes(q) &&
          !ev.category?.toLowerCase().includes(q) &&
          !ev.assigneeName?.toLowerCase().includes(q)
        )
          return false;
      }
      if (selectedColors.length > 0 && !selectedColors.includes(ev.color)) return false;
      if (selectedCategories.length > 0 && ev.category && !selectedCategories.includes(ev.category)) return false;
      return true;
    });
  }, [events, searchQuery, selectedColors, selectedCategories, selectedAssigneeId]);

  const hasActiveFilters = selectedColors.length > 0 || selectedCategories.length > 0 || !!selectedAssigneeId;
  const clearFilters = () => {
    setSelectedColors([]);
    setSelectedCategories([]);
    setSelectedAssigneeId("");
    setSearchQuery("");
  };

  const getColorClasses = (colorValue: string) =>
    COLOR_MAP[colorValue] ?? COLOR_MAP.blue;

  const navigate = (dir: "prev" | "next") => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (view === "month") d.setMonth(prev.getMonth() + (dir === "next" ? 1 : -1));
      else if (view === "week") return dir === "next" ? addWeeks(prev, 1) : addWeeks(prev, -1);
      else if (view === "day") return addDays(prev, dir === "next" ? 1 : -1);
      return prev;
    });
  };

  const openCreate = (clickedDate?: Date) => {
    setIsCreating(true);
    setSelectedEvent(null);
    const base = clickedDate ? new Date(clickedDate) : new Date(currentDate);
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 9, 0, 0, 0);
    const end = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 10, 0, 0, 0);
    setFormTitle("");
    setFormDescription("");
    setFormStart(format(d, "yyyy-MM-dd'T'HH:mm"));
    setFormEnd(format(end, "yyyy-MM-dd'T'HH:mm"));
    setFormAssigneeId("");
    setFormCategory("팀 일정");
    setFormColor("blue");
    setFormError("");
    setIsDialogOpen(true);
  };

  const openEdit = (ev: CalendarEventView) => {
    if (ev.isAnnouncement || ev.isLeave) return;
    setIsCreating(false);
    setSelectedEvent(ev);
    setFormTitle(ev.title);
    setFormDescription(ev.description ?? "");
    setFormStart(format(new Date(ev.startTime.getTime() - ev.startTime.getTimezoneOffset() * 60000), "yyyy-MM-dd'T'HH:mm"));
    setFormEnd(format(new Date(ev.endTime.getTime() - ev.endTime.getTimezoneOffset() * 60000), "yyyy-MM-dd'T'HH:mm"));
    setFormAssigneeId(ev.assigneeId ?? "");
    setFormCategory(ev.category ?? "팀 일정");
    setFormColor(ev.color ?? "blue");
    setFormError("");
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setIsCreating(false);
    setSelectedEvent(null);
    setFilterOpen(null);
  };

  const handleSave = async () => {
    setFormError("");
    if (!formTitle.trim()) {
      setFormError("제목을 입력해주세요.");
      return;
    }
    if (!formStart || !formEnd) {
      setFormError("시작·종료 일시를 입력해주세요.");
      return;
    }
    const startAt = new Date(formStart);
    const endAt = new Date(formEnd);
    if (endAt <= startAt) {
      setFormError("종료 일시가 시작 일시보다 이후여야 합니다.");
      return;
    }
    if (isCEO && isCreating && !formAssigneeId) {
      setFormError("담당자를 선택해주세요.");
      return;
    }
    setFormSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        start: startAt.toISOString(),
        end: endAt.toISOString(),
        category: formCategory,
        color: formColor,
      };
      const selected = users.find((u) => u.id === formAssigneeId);
      if (isCEO && formAssigneeId && selected?.teamId) {
        body.assigneeId = formAssigneeId;
        body.teamId = selected.teamId;
      }
      const url = selectedEvent ? `/api/events/${selectedEvent.id}` : "/api/events";
      const method = selectedEvent ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        closeDialog();
        fetchEvents();
      } else {
        setFormError(json.error?.message ?? "저장에 실패했습니다.");
      }
    } finally {
      setFormSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent || selectedEvent.isAnnouncement) return;
    setFormDeleting(true);
    setFormError("");
    try {
      const res = await fetch(`/api/events/${selectedEvent.id}`, { method: "DELETE", credentials: "include" });
      const json = await res.json();
      if (json.success) {
        closeDialog();
        fetchEvents();
      } else {
        setFormError(json.error?.message ?? "삭제에 실패했습니다.");
      }
    } finally {
      setFormDeleting(false);
    }
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => e.category && set.add(e.category));
    return Array.from(set).sort();
  }, [events]);

  return (
    <div className="flex flex-col gap-4">
      {/* 상단: 제목 + 날짜 네비 + 뷰 전환 + 새 일정 */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <h2 className="text-xl font-semibold text-slate-800 sm:text-2xl">
            {view === "month" && format(currentDate, "yyyy년 M월", { locale: ko })}
            {view === "week" &&
              `${format(startOfWeek(currentDate, { weekStartsOn: 0 }), "M/d", { locale: ko })} 주`}
            {view === "day" && format(currentDate, "yyyy년 M월 d일 (EEEE)", { locale: ko })}
            {view === "list" && "전체 일정"}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("prev")}
              className="h-8 w-8 rounded-lg border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentDate(new Date())}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              오늘
            </button>
            <button
              type="button"
              onClick={() => navigate("next")}
              className="h-8 w-8 rounded-lg border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
          {/* 모바일: 뷰 선택 드롭다운 */}
          <div className="sm:hidden">
            <select
              value={view}
              onChange={(e) => setView(e.target.value as typeof view)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="month">월</option>
              <option value="week">주</option>
              <option value="day">일</option>
              <option value="list">목록</option>
            </select>
          </div>
          {/* 데스크톱: 뷰 버튼 그룹 */}
          <div className="hidden sm:flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/50 p-1">
            {(
              [
                { v: "month" as const, label: "월", Icon: Calendar },
                { v: "week" as const, label: "주", Icon: LayoutGrid },
                { v: "day" as const, label: "일", Icon: Clock },
                { v: "list" as const, label: "목록", Icon: List },
              ] as const
            ).map(({ v, label, Icon }) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "flex h-8 items-center gap-1 rounded-md px-2 text-sm font-medium",
                  view === v ? "bg-white text-slate-800 shadow-sm" : "text-slate-600 hover:text-slate-800"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => openCreate()}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            새 일정
          </button>
        </div>
      </div>

      {/* 검색바 */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="일정 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-9 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 필터: 담당자, 색상, 카테고리 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <select
            value={selectedAssigneeId}
            onChange={(e) => setSelectedAssigneeId(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
          >
            <option value="">담당자: 전체</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setFilterOpen(filterOpen === "color" ? null : "color")}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
          >
            <Filter className="h-4 w-4" />
            색상
            {selectedColors.length > 0 && (
              <span className="rounded-full bg-slate-200 px-1.5 text-xs">{selectedColors.length}</span>
            )}
          </button>
          {filterOpen === "color" && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(null)} aria-hidden />
              <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                {Object.entries(COLOR_MAP).map(([value, { bg }]) => (
                  <label key={value} className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={selectedColors.includes(value)}
                      onChange={(e) =>
                        setSelectedColors((prev) =>
                          e.target.checked ? [...prev, value] : prev.filter((c) => c !== value)
                        )
                      }
                      className="rounded border-slate-300"
                    />
                    <span className={cn("h-3 w-3 rounded", bg)} />
                    <span className="text-sm">{value}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setFilterOpen(filterOpen === "category" ? null : "category")}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
          >
            <Filter className="h-4 w-4" />
            카테고리
            {selectedCategories.length > 0 && (
              <span className="rounded-full bg-slate-200 px-1.5 text-xs">{selectedCategories.length}</span>
            )}
          </button>
          {filterOpen === "category" && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(null)} aria-hidden />
              <div className="absolute left-0 top-full z-20 mt-1 max-h-60 w-48 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                {categories.map((cat) => (
                  <label key={cat} className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat)}
                      onChange={(e) =>
                        setSelectedCategories((prev) =>
                          e.target.checked ? [...prev, cat] : prev.filter((c) => c !== cat)
                        )
                      }
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm">{cat}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
            필터 지우기
          </button>
        )}
      </div>

      {/* 활성 필터 배지 */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-500">적용 중:</span>
          {selectedAssigneeId && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs">
              담당자: {users.find((u) => u.id === selectedAssigneeId)?.name ?? selectedAssigneeId}
              <button type="button" onClick={() => setSelectedAssigneeId("")}>
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {selectedColors.map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs"
            >
              <span className={cn("h-2 w-2 rounded-full", COLOR_MAP[c]?.bg ?? "bg-slate-400")} />
              {c}
              <button type="button" onClick={() => setSelectedColors((p) => p.filter((x) => x !== c))}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {selectedCategories.map((cat) => (
            <span
              key={cat}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs"
            >
              {cat}
              <button type="button" onClick={() => setSelectedCategories((p) => p.filter((x) => x !== cat))}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* 뷰 영역 */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
          로딩 중...
        </div>
      ) : view === "month" ? (
        <MonthView
          currentDate={currentDate}
          events={filteredEvents}
          onEventClick={openEdit}
          onDayClick={openCreate}
          getColorClasses={getColorClasses}
        />
      ) : view === "week" ? (
        <WeekView
          currentDate={currentDate}
          events={filteredEvents}
          onEventClick={openEdit}
          getColorClasses={getColorClasses}
        />
      ) : view === "day" ? (
        <DayView
          currentDate={currentDate}
          events={filteredEvents}
          onEventClick={openEdit}
          getColorClasses={getColorClasses}
        />
      ) : (
        <ListView
          events={filteredEvents}
          onEventClick={openEdit}
          getColorClasses={getColorClasses}
        />
      )}

      {/* 일정 생성/수정 모달 */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-200 p-4">
              <h3 className="text-lg font-semibold text-slate-800">
                {isCreating ? "새 일정" : "일정 수정"}
              </h3>
            </div>
            <div className="space-y-4 p-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">제목 *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="일정 제목"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              {isCEO && isCreating && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">담당자 *</label>
                  <select
                    value={formAssigneeId}
                    onChange={(e) => setFormAssigneeId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">선택</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.teamName ?? "-"})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">카테고리</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="전체 공지">전체 공지</option>
                  <option value="팀 일정">팀 일정</option>
                  <option value="연차">연차</option>
                  <option value="기타">기타</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">색상</label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(COLOR_MAP) as Array<keyof typeof COLOR_MAP>).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFormColor(key)}
                      className={cn(
                        "h-8 w-8 rounded-full border-2 transition",
                        formColor === key ? "border-slate-800 ring-2 ring-slate-300" : "border-slate-200",
                        COLOR_MAP[key].bg
                      )}
                      title={key}
                    />
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">시작 *</label>
                  <input
                    type="datetime-local"
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">종료 *</label>
                  <input
                    type="datetime-local"
                    value={formEnd}
                    onChange={(e) => setFormEnd(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">설명 (선택)</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="설명"
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm resize-none"
                />
              </div>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
            </div>
            <div className="flex gap-2 border-t border-slate-200 p-4">
              {!isCreating && selectedEvent && !selectedEvent.isAnnouncement && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={formDeleting}
                  className="rounded-xl border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {formDeleting ? "삭제 중..." : "삭제"}
                </button>
              )}
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={formSaving}
                className="ml-auto rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {formSaving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AssigneeBadge({ event }: { event: CalendarEventView }) {
  const name = event.assigneeName?.trim();
  const initial = name ? name.charAt(0).toUpperCase() : "?";
  if (event.assigneeAvatarUrl) {
    return (
      <img
        src={event.assigneeAvatarUrl}
        alt={name ?? ""}
        className="h-4 w-4 flex-shrink-0 rounded-full border border-white/50 object-cover"
      />
    );
  }
  return (
    <span
      className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-white/25 text-[10px] font-medium"
      title={name ?? undefined}
    >
      {initial}
    </span>
  );
}

function EventCard({
  event,
  onClick,
  getColorClasses,
  variant = "default",
}: {
  event: CalendarEventView;
  onClick: () => void;
  getColorClasses: (c: string) => { bg: string; text: string };
  variant?: "default" | "compact" | "detailed";
}) {
  const color = getColorClasses(event.color);
  const timeStr = `${format(event.startTime, "HH:mm", { locale: ko })} - ${format(event.endTime, "HH:mm", { locale: ko })}`;

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={cn(
          "flex w-full items-center gap-1 text-left rounded px-1.5 py-0.5 text-xs font-medium text-white truncate",
          color.bg
        )}
      >
        {(event.assigneeName || event.assigneeAvatarUrl) && <AssigneeBadge event={event} />}
        <span className="min-w-0 truncate">{event.title}</span>
      </button>
    );
  }

  if (variant === "detailed") {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={cn(
          "w-full text-left rounded-lg p-3 text-white transition-shadow hover:shadow-md",
          color.bg
        )}
      >
        <div className="flex items-center gap-2">
          {(event.assigneeName || event.assigneeAvatarUrl) && <AssigneeBadge event={event} />}
          <div className="font-semibold">{event.title}</div>
        </div>
        {event.description && <div className="mt-1 text-sm opacity-90 line-clamp-2">{event.description}</div>}
        <div className="mt-2 flex items-center gap-2 text-xs opacity-80">
          <Clock className="h-3 w-3" />
          {timeStr}
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "flex w-full items-center gap-1.5 text-left rounded px-2 py-1 text-xs font-medium text-white truncate",
        color.bg
      )}
    >
      {(event.assigneeName || event.assigneeAvatarUrl) && <AssigneeBadge event={event} />}
      <span className="min-w-0 truncate">{event.title}</span>
    </button>
  );
}

function MonthView({
  currentDate,
  events,
  onEventClick,
  onDayClick,
  getColorClasses,
}: {
  currentDate: Date;
  events: CalendarEventView[];
  onEventClick: (ev: CalendarEventView) => void;
  onDayClick: (day: Date) => void;
  getColorClasses: (c: string) => { bg: string; text: string };
}) {
  const first = startOfMonth(currentDate);
  const start = startOfWeek(first, { weekStartsOn: 0 });
  const days: Date[] = [];
  let d = new Date(start);
  for (let i = 0; i < 42; i++) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }

  const getEventsForDay = (day: Date) =>
    events.filter((ev) => {
      const t = new Date(ev.startTime);
      return isSameDay(t, day);
    });

  const weekDayLabels = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="grid grid-cols-7 border-b border-slate-200">
        {weekDayLabels.map((label, idx) => (
          <div
            key={label}
            className={cn(
              "border-r border-slate-200 p-2 text-center text-xs font-medium last:border-r-0 sm:text-sm",
              idx === 0 && "bg-red-50/80 text-red-700",
              idx === 6 && "bg-blue-50/80 text-blue-700"
            )}
          >
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{label.charAt(0)}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const isToday = isSameDay(day, new Date());
          const dayOfWeek = day.getDay();
          const isSunday = dayOfWeek === 0;
          const isSaturday = dayOfWeek === 6;
          return (
            <div
              key={i}
              role="button"
              tabIndex={0}
              onClick={() => onDayClick(day)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onDayClick(day)}
              className={cn(
                "min-h-20 cursor-pointer border-b border-r border-slate-200 p-1.5 last:border-r-0 sm:min-h-28 sm:p-2",
                !isCurrentMonth && "bg-slate-50/50",
                "hover:bg-slate-50/80",
                isSunday && "bg-red-50/50",
                isSaturday && "bg-blue-50/50"
              )}
            >
              <div
                className={cn(
                  "mb-1 flex h-6 w-6 items-center justify-center rounded-full text-sm",
                  isToday && "bg-blue-600 font-semibold text-white",
                  !isToday && isSunday && "text-red-700",
                  !isToday && isSaturday && "text-blue-700"
                )}
              >
                {day.getDate()}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((ev) => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    onClick={() => onEventClick(ev)}
                    getColorClasses={getColorClasses}
                    variant="compact"
                  />
                ))}
                {dayEvents.length > 3 && (
                  <p className="text-[10px] text-slate-400 sm:text-xs">+{dayEvents.length - 3}건</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({
  currentDate,
  events,
  onEventClick,
  getColorClasses,
}: {
  currentDate: Date;
  events: CalendarEventView[];
  onEventClick: (ev: CalendarEventView) => void;
  getColorClasses: (c: string) => { bg: string; text: string };
}) {
  const start = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getEventsForSlot = (day: Date, hour: number) =>
    events.filter((ev) => {
      const t = new Date(ev.startTime);
      return isSameDay(t, day) && t.getHours() === hour;
    });

  return (
    <div className="overflow-auto rounded-2xl border border-slate-200 bg-white">
      <div className="grid grid-cols-8 border-b border-slate-200">
        <div className="border-r border-slate-200 p-2 text-center text-xs font-medium text-slate-600 sm:text-sm">
          시간
        </div>
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            className="border-r border-slate-200 p-2 text-center text-xs font-medium last:border-r-0 sm:text-sm"
          >
            <div className="hidden sm:block">{format(day, "EEE", { locale: ko })}</div>
            <div className="sm:hidden">{format(day, "E", { locale: ko })}</div>
            <div className="text-[10px] text-slate-500 sm:text-xs">{format(day, "M/d", { locale: ko })}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-8">
        {hours.map((hour) => (
          <Fragment key={hour}>
            <div className="border-b border-r border-slate-200 p-1 text-[10px] text-slate-500 sm:p-2 sm:text-xs">
              {hour.toString().padStart(2, "0")}:00
            </div>
            {weekDays.map((day) => {
              const slotEvents = getEventsForSlot(day, hour);
              return (
                <div
                  key={`${day.toISOString()}-${hour}`}
                  className="min-h-12 border-b border-r border-slate-200 p-0.5 last:border-r-0 sm:min-h-16 sm:p-1"
                >
                  <div className="space-y-1">
                    {slotEvents.map((ev) => (
                      <EventCard
                        key={ev.id}
                        event={ev}
                        onClick={() => onEventClick(ev)}
                        getColorClasses={getColorClasses}
                        variant="default"
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function DayView({
  currentDate,
  events,
  onEventClick,
  getColorClasses,
}: {
  currentDate: Date;
  events: CalendarEventView[];
  onEventClick: (ev: CalendarEventView) => void;
  getColorClasses: (c: string) => { bg: string; text: string };
}) {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getEventsForHour = (hour: number) =>
    events.filter((ev) => {
      const t = new Date(ev.startTime);
      return isSameDay(t, currentDate) && t.getHours() === hour;
    });

  return (
    <div className="overflow-auto rounded-2xl border border-slate-200 bg-white">
      {hours.map((hour) => {
        const hourEvents = getEventsForHour(hour);
        return (
          <div key={hour} className="flex border-b border-slate-200 last:border-b-0">
            <div className="w-14 flex-shrink-0 border-r border-slate-200 p-2 text-xs text-slate-500 sm:w-20 sm:p-3 sm:text-sm">
              {hour.toString().padStart(2, "0")}:00
            </div>
            <div className="min-h-16 flex-1 p-1 sm:min-h-20 sm:p-2">
              <div className="space-y-2">
                {hourEvents.map((ev) => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    onClick={() => onEventClick(ev)}
                    getColorClasses={getColorClasses}
                    variant="detailed"
                  />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ListView({
  events,
  onEventClick,
  getColorClasses,
}: {
  events: CalendarEventView[];
  onEventClick: (ev: CalendarEventView) => void;
  getColorClasses: (c: string) => { bg: string; text: string };
}) {
  const sorted = [...events].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  const grouped = sorted.reduce<Record<string, CalendarEventView[]>>((acc, ev) => {
    const key = format(ev.startTime, "yyyy년 M월 d일 (EEEE)", { locale: ko });
    if (!acc[key]) acc[key] = [];
    acc[key].push(ev);
    return acc;
  }, {});

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      <div className="space-y-6">
        {Object.entries(grouped).map(([dateLabel, list]) => (
          <div key={dateLabel} className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-500">{dateLabel}</h3>
            <div className="space-y-2">
              {list.map((ev) => {
                const color = getColorClasses(ev.color);
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => onEventClick(ev)}
                    className="group w-full rounded-xl border border-slate-200 bg-white p-3 text-left transition-shadow hover:shadow-md sm:p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("mt-1 h-3 w-3 flex-shrink-0 rounded-full", color.bg)} />
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-slate-800 group-hover:text-blue-600 truncate">
                          {ev.title}
                        </h4>
                        {ev.description && (
                          <p className="mt-1 text-sm text-slate-500 line-clamp-2">{ev.description}</p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          {(ev.assigneeName || ev.assigneeAvatarUrl) && (
                            <span className="flex items-center gap-1">
                              <AssigneeBadge event={ev} />
                              <span>{ev.assigneeName}</span>
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(ev.startTime, "HH:mm", { locale: ko })} - {format(ev.endTime, "HH:mm", { locale: ko })}
                          </span>
                          {ev.category && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5">{ev.category}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {sorted.length === 0 && (
          <div className="py-12 text-center text-sm text-slate-500">일정이 없습니다.</div>
        )}
      </div>
    </div>
  );
}
