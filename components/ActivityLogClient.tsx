"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import Link from "next/link";

type ActivityItem = {
  type: string;
  userId: string;
  userName: string;
  teamId: string | null;
  teamName: string | null;
  text: string;
  link: string | null;
  createdAt: string;
};

type Team = { id: string; name: string };
type UserOption = { id: string; name: string };

const TYPE_LABEL: Record<string, string> = {
  task_history: "업무",
  leave: "연차",
  attendance: "출퇴근",
};

export default function ActivityLogClient() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [teamId, setTeamId] = useState("");
  const [userId, setUserId] = useState("");
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/teams", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setTeams(j.data ?? []);
      });
  }, []);

  useEffect(() => {
    const url = teamId ? `/api/users?teamId=${teamId}` : "/api/users";
    fetch(url, { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setUsers(j.data?.map((u: { id: string; name: string }) => ({ id: u.id, name: u.name })) ?? []);
      })
      .catch(() => setUsers([]));
  }, [teamId]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (teamId) params.set("teamId", teamId);
    if (userId) params.set("userId", userId);
    if (type) params.set("type", type);
    params.set("limit", "50");
    fetch(`/api/activity?${params}`, { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setItems(j.data ?? []);
        else setItems([]);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [teamId, userId, type]);

  const icon = (t: string) => {
    switch (t) {
      case "task_history": return "📌";
      case "leave": return "🏖️";
      case "attendance": return "🕐";
      default: return "•";
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex flex-wrap gap-2">
        <select
          value={teamId}
          onChange={(e) => { setTeamId(e.target.value); setUserId(""); }}
          className="text-sm border border-slate-300 rounded-lg px-2 py-1.5"
        >
          <option value="">팀 전체</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-2 py-1.5"
        >
          <option value="">사용자 전체</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-2 py-1.5"
        >
          <option value="">타입 전체</option>
          <option value="task_history">업무</option>
          <option value="leave">연차</option>
          <option value="attendance">출퇴근</option>
        </select>
      </div>
      <div className="p-4 max-h-[60vh] overflow-y-auto">
        {loading ? (
          <p className="text-slate-500 text-sm">로딩 중...</p>
        ) : items.length === 0 ? (
          <p className="text-slate-500 text-sm">조건에 맞는 활동이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((a, i) => (
              <li key={i} className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
                <span className="text-lg flex-shrink-0">{icon(a.type)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-700">
                    <span className="font-medium text-slate-800">{a.userName}</span>
                    {a.teamName && (
                      <span className="ml-1 text-slate-500">({a.teamName})</span>
                    )}
                    <span className="mx-1">→</span>
                    {a.link ? (
                      <Link href={a.link} className="text-blue-600 hover:underline">
                        {a.text}
                      </Link>
                    ) : (
                      <span>{a.text}</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {format(new Date(a.createdAt), "yyyy.MM.dd HH:mm", { locale: ko })}
                    <span className="ml-2">{TYPE_LABEL[a.type] ?? a.type}</span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
