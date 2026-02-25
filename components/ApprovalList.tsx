"use client";

import { useState, useEffect } from "react";

type PendingUser = {
  id: string;
  username: string;
  name: string;
  email: string | null;
  teamId: string | null;
  teamName: string | null;
  role: string;
  status: string;
  createdAt: string;
};

export default function ApprovalList() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const fetchPending = () => {
    setLoading(true);
    fetch("/api/users?status=PENDING", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setUsers(j.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPending();
  }, []);

  async function handleApprove(userId: string) {
    setApprovingId(userId);
    try {
      const res = await fetch(`/api/users/${userId}/approve`, {
        method: "PATCH",
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      }
    } finally {
      setApprovingId(null);
    }
  }

  if (loading) return <p className="text-slate-500">로딩 중...</p>;

  if (users.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
        승인 대기 중인 사용자가 없습니다.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <ul className="divide-y divide-slate-100">
        {users.map((u) => (
          <li key={u.id} className="flex items-center justify-between px-4 py-4 hover:bg-slate-50">
            <div>
              <p className="font-medium text-slate-800">{u.name}</p>
              <p className="text-sm text-slate-500">
                {u.username}
                {u.email ? ` · ${u.email}` : ""}
              </p>
              <p className="text-xs text-slate-400">
                가입일: {new Date(u.createdAt).toLocaleDateString("ko-KR")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleApprove(u.id)}
              disabled={approvingId === u.id}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {approvingId === u.id ? "승인 중..." : "승인"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
