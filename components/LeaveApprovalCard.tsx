"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

type PendingLeave = {
  id: string;
  userId: string;
  userName: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: string;
  createdAt: string;
};

export default function LeaveApprovalCard({ onUpdated }: { onUpdated?: () => void }) {
  const [list, setList] = useState<PendingLeave[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = () => {
    fetch("/api/leave?status=pending", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setList(j.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  async function handleApproveReject(id: string, status: "approved" | "rejected") {
    setActingId(id);
    try {
      const res = await fetch(`/api/leave/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        load();
        onUpdated?.();
      }
    } finally {
      setActingId(null);
    }
  }

  if (loading || list.length === 0) return null;

  return (
    <div className="bg-amber-50 rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
      <h2 className="font-semibold text-slate-800 p-4 border-b border-amber-100">
        연차 승인 대기 ({list.length}건)
      </h2>
      <ul className="divide-y divide-amber-100">
        {list.map((l) => (
          <li key={l.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-medium text-slate-800">{l.userName}</p>
              <p className="text-sm text-slate-600">
                {format(new Date(l.startDate), "yyyy-MM-dd", { locale: ko })} ~{" "}
                {format(new Date(l.endDate), "yyyy-MM-dd", { locale: ko })}
                {l.reason && ` · ${l.reason}`}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleApproveReject(l.id, "approved")}
                disabled={actingId === l.id}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-50"
              >
                승인
              </button>
              <button
                type="button"
                onClick={() => handleApproveReject(l.id, "rejected")}
                disabled={actingId === l.id}
                className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50"
              >
                반려
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
