"use client";

import { useState } from "react";

type UserRow = {
  id: string;
  username: string;
  name: string;
  email: string | null;
  teamId: string | null;
  teamName: string | null;
  role: string;
  status: string;
};

type Team = { id: string; name: string };

const ROLE_LABEL: Record<string, string> = {
  CEO: "대표",
  TEAM_LEADER: "팀장",
  TEAM_MEMBER: "팀원",
};

export default function MembersTable({
  initialUsers,
  initialTeams,
  currentUserRole,
  currentUserTeamId,
}: {
  initialUsers: UserRow[];
  initialTeams: Team[];
  currentUserRole: string;
  currentUserTeamId: string | null;
}) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [teams] = useState<Team[]>(initialTeams);
  const [selectedTeam, setSelectedTeam] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    initialUsers.forEach((u) => {
      map[u.id] = u.teamId ?? "";
    });
    return map;
  });
  const [selectedRole, setSelectedRole] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    initialUsers.forEach((u) => {
      map[u.id] = u.role;
    });
    return map;
  });
  const [savingId, setSavingId] = useState<string | null>(null);

  const isCEO = currentUserRole === "CEO";
  const isTeamLeader = currentUserRole === "TEAM_LEADER";

  const canEditTeam = isCEO;
  const canEditRole = (row: UserRow) => {
    if (isCEO) return true;
    if (isTeamLeader && currentUserTeamId && row.teamId === currentUserTeamId) return true;
    return false;
  };
  const roleOptions = (row: UserRow) => {
    if (isCEO) return ["CEO", "TEAM_LEADER", "TEAM_MEMBER"];
    if (isTeamLeader && row.teamId === currentUserTeamId) return ["TEAM_LEADER", "TEAM_MEMBER"];
    return [];
  };

  const handleSave = async (userId: string) => {
    const current = users.find((u) => u.id === userId);
    if (!current) return;

    const newTeamId = canEditTeam ? (selectedTeam[userId] ?? current.teamId ?? "").trim() || null : current.teamId ?? null;
    const newRole = selectedRole[userId] ?? current.role;
    const teamChanged = canEditTeam && newTeamId !== (current.teamId ?? null);
    const roleChanged = canEditRole(current) && newRole !== current.role;

    if (!teamChanged && !roleChanged) return;

    setSavingId(userId);
    try {
      if (teamChanged && !roleChanged && isCEO) {
        const res = await fetch(`/api/users/${userId}/team`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ teamId: newTeamId }),
        });
        const json = await res.json();
        if (json.success && json.data) {
          const data = json.data as UserRow;
          setUsers((prev) =>
            prev.map((u) =>
              u.id === userId ? { ...u, teamId: data.teamId, teamName: data.teamName } : u
            )
          );
          setSelectedTeam((prev) => ({ ...prev, [userId]: data.teamId ?? "" }));
        }
      } else {
        const body: { teamId?: string | null; role?: string } = {};
        if (teamChanged && isCEO) body.teamId = newTeamId;
        if (roleChanged && canEditRole(current)) body.role = newRole;
        const res = await fetch(`/api/users/${userId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (json.success && json.data) {
          const data = json.data as UserRow;
          setUsers((prev) =>
            prev.map((u) =>
              u.id === userId
                ? {
                    ...u,
                    teamId: data.teamId,
                    teamName: data.teamName,
                    role: data.role,
                  }
                : u
            )
          );
          setSelectedTeam((prev) => ({ ...prev, [userId]: data.teamId ?? "" }));
          setSelectedRole((prev) => ({ ...prev, [userId]: data.role }));
        }
      }
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left p-3 text-sm font-medium text-slate-600">이름</th>
              <th className="text-left p-3 text-sm font-medium text-slate-600">아이디</th>
              <th className="text-left p-3 text-sm font-medium text-slate-600">역할</th>
              <th className="text-left p-3 text-sm font-medium text-slate-600">현재 팀</th>
              <th className="text-left p-3 text-sm font-medium text-slate-600">팀 선택</th>
              <th className="text-left p-3 text-sm font-medium text-slate-600">저장</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const opts = roleOptions(u);
              const roleEditable = opts.length > 0;
              const teamEditable = canEditTeam;
              const hasChange =
                (teamEditable && (selectedTeam[u.id] ?? u.teamId ?? "") !== (u.teamId ?? "")) ||
                (roleEditable && (selectedRole[u.id] ?? u.role) !== u.role);
              return (
                <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="p-3 text-sm text-slate-800">{u.name}</td>
                  <td className="p-3 text-sm text-slate-600">{u.username}</td>
                  <td className="p-3 text-sm text-slate-600">
                    {roleEditable ? (
                      <select
                        value={selectedRole[u.id] ?? u.role}
                        onChange={(e) =>
                          setSelectedRole((prev) => ({ ...prev, [u.id]: e.target.value }))
                        }
                        className="px-2 py-1.5 text-sm border border-slate-300 rounded-lg"
                      >
                        {opts.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABEL[r] ?? r}
                          </option>
                        ))}
                      </select>
                    ) : (
                      ROLE_LABEL[u.role] ?? u.role
                    )}
                  </td>
                  <td className="p-3 text-sm text-slate-600">{u.teamName ?? "-"}</td>
                  <td className="p-3">
                    {teamEditable ? (
                      <select
                        value={selectedTeam[u.id] ?? (u.teamId ?? "")}
                        onChange={(e) =>
                          setSelectedTeam((prev) => ({ ...prev, [u.id]: e.target.value }))
                        }
                        className="w-full max-w-[180px] px-2 py-1.5 text-sm border border-slate-300 rounded-lg"
                      >
                        <option value="">팀 없음</option>
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm text-slate-600">{u.teamName ?? "-"}</span>
                    )}
                  </td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => handleSave(u.id)}
                      disabled={savingId === u.id || !hasChange}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingId === u.id ? "저장 중..." : "저장"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
