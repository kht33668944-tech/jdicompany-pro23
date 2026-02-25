"use client";

import { useState, useEffect } from "react";

type Team = { id: string; name: string; description: string | null; memberCount: number };
type User = { id: string; username: string; name: string; email: string | null; teamId: string | null; teamName: string | null; role: string };

export default function TeamUserManagement() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tab, setTab] = useState<"teams" | "users">("teams");
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch("/api/teams", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => j.success && setTeams(j.data));
    fetch("/api/users", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => j.success && setUsers(j.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <p className="text-slate-500">로딩 중...</p>;

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setTab("teams")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tab === "teams" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}
        >
          팀 관리
        </button>
        <button
          type="button"
          onClick={() => setTab("users")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tab === "users" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}
        >
          직원 관리
        </button>
      </div>

      {tab === "teams" && (
        <div className="space-y-2">
          {teams.map((t) => (
            <div key={t.id} className="flex items-center justify-between py-2 border-b border-slate-100">
              <div>
                <span className="font-medium text-slate-800">{t.name}</span>
                {t.description && <span className="text-slate-500 text-sm ml-2">{t.description}</span>}
                <span className="text-slate-400 text-sm ml-2">({t.memberCount}명)</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "users" && (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between py-2 border-b border-slate-100">
              <div>
                <span className="font-medium text-slate-800">{u.name}</span>
                <span className="text-slate-500 text-sm ml-2">{u.username}</span>
                <span className="text-slate-400 text-sm ml-2">{u.teamName ?? "-"} · {u.role === "CEO" ? "대표" : "팀원"}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
