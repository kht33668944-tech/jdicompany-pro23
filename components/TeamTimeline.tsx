"use client";

import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ko } from "date-fns/locale";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

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

type ScheduleEvent = {
  id: string;
  title: string;
  description?: string | null;
  startAt: string;
  endAt: string;
  assigneeName: string;
  assigneeAvatarUrl?: string | null;
  category?: string | null;
  color?: string;
};

type LeaveItem = {
  id: string;
  userName: string;
  userAvatarUrl?: string | null;
  startDate: string;
  endDate: string;
  status: string;
  reason?: string | null;
};

type TimelineItem = {
  id: string;
  type: "event" | "leave";
  title: string;
  description?: string | null;
  startTime: Date;
  endTime: Date;
  assigneeName: string;
  assigneeAvatarUrl?: string | null;
  category?: string | null;
  color: string;
};

function AvatarBadge({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl?: string | null;
}) {
  const initial = name?.trim() ? name.charAt(0).toUpperCase() : "?";
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="h-5 w-5 flex-shrink-0 rounded-full border border-slate-200 object-cover"
      />
    );
  }
  return (
    <span
      className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-medium text-slate-600"
      title={name}
    >
      {initial}
    </span>
  );
}

export default function TeamTimeline({ teamId }: { teamId: string }) {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const from = startOfMonth(new Date());
  const to = endOfMonth(new Date());
  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`/api/teams/${teamId}/schedule?from=${fromStr}&to=${toStr}`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          setEvents(j.data.events ?? []);
          setLeaves(j.data.leaveRequests ?? []);
        } else {
          setError(j.error?.message ?? "로드 실패");
        }
      })
      .catch(() => setError("네트워크 오류"))
      .finally(() => setLoading(false));
  }, [teamId, fromStr, toStr]);

  const timelineItems: TimelineItem[] = [
    ...events.map((e) => ({
      id: e.id,
      type: "event" as const,
      title: e.title,
      description: e.description,
      startTime: new Date(e.startAt),
      endTime: new Date(e.endAt),
      assigneeName: e.assigneeName,
      assigneeAvatarUrl: e.assigneeAvatarUrl ?? null,
      category: e.category ?? null,
      color: e.color && COLOR_MAP[e.color] ? e.color : "blue",
    })),
    ...leaves
      .filter((l) => l.status === "approved")
      .map((l) => ({
        id: `leave-${l.id}`,
        type: "leave" as const,
        title: `${l.userName} 연차`,
        description: l.reason ?? undefined,
        startTime: new Date(l.startDate),
        endTime: new Date(l.endDate),
        assigneeName: l.userName,
        assigneeAvatarUrl: l.userAvatarUrl ?? null,
        category: "연차" as const,
        color: "amber",
      })),
  ].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const grouped = timelineItems.reduce<Record<string, TimelineItem[]>>(
    (acc, item) => {
      const key = format(item.startTime, "yyyy년 M월 d일 (EEEE)", {
        locale: ko,
      });
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {}
  );

  const getColorClasses = (color: string) =>
    COLOR_MAP[color] ?? COLOR_MAP.blue;

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <p className="text-center text-sm text-slate-500">로딩 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-100 bg-white p-6 sm:p-8">
        <p className="text-center text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 sm:p-6">
      <h2 className="text-base font-semibold text-slate-800 mb-4 sm:text-lg">
        팀 일정 · 연차
      </h2>
      <div className="space-y-6">
        {Object.entries(grouped).map(([dateLabel, list]) => (
          <div key={dateLabel} className="space-y-2 sm:space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 sm:text-sm">
              {dateLabel}
            </h3>
            <div className="space-y-2">
              {list.map((item) => {
                const color = getColorClasses(item.color);
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "group w-full rounded-xl border border-slate-200 bg-white p-3 text-left transition-shadow hover:shadow-md sm:p-4",
                      "flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3"
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-2 sm:gap-3">
                      <div
                        className={cn(
                          "mt-0.5 h-3 w-3 flex-shrink-0 rounded-full sm:mt-1",
                          color.bg
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-slate-800 truncate group-hover:text-blue-600">
                          {item.title}
                        </h4>
                        {item.description && (
                          <p className="mt-1 text-sm text-slate-500 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <AvatarBadge
                              name={item.assigneeName}
                              avatarUrl={item.assigneeAvatarUrl}
                            />
                            <span>{item.assigneeName}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            {format(item.startTime, "HH:mm", { locale: ko })}{" "}
                            –{" "}
                            {item.type === "leave"
                              ? format(item.endTime, "M/d", { locale: ko })
                              : format(item.endTime, "HH:mm", { locale: ko })}
                          </span>
                          {item.category && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5">
                              {item.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {timelineItems.length === 0 && (
          <div className="py-8 text-center text-sm text-slate-500">
            이번 달 팀 일정·연차가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
