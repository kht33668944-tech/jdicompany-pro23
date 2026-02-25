"use client";

import { useState, useEffect, useMemo } from "react";
import { format, startOfYear, endOfYear, differenceInCalendarDays } from "date-fns";
import { ko } from "date-fns/locale";

const ANNUAL_LEAVE_DAYS = 15;

type LeaveItem = {
  id: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: string;
  createdAt: string;
};

function useLeaveBalance(list: LeaveItem[]) {
  return useMemo(() => {
    const now = new Date();
    const yearStart = startOfYear(now);
    const yearEnd = endOfYear(now);
    let used = 0;
    list
      .filter((l) => l.status === "approved")
      .forEach((l) => {
        const start = new Date(l.startDate);
        const end = new Date(l.endDate);
        if (end < yearStart || start > yearEnd) return;
        const overlapStart = start < yearStart ? yearStart : start;
        const overlapEnd = end > yearEnd ? yearEnd : end;
        const days = differenceInCalendarDays(overlapEnd, overlapStart) + 1;
        used += Math.max(0, days);
      });
    const remaining = Math.max(0, ANNUAL_LEAVE_DAYS - used);
    return { used, remaining };
  }, [list]);
}

export default function LeaveRequestForm({ onSubmitted }: { onSubmitted?: () => void }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [list, setList] = useState<LeaveItem[]>([]);
  const { used, remaining } = useLeaveBalance(list);

  const loadList = () => {
    fetch("/api/leave", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setList(j.data);
      });
  };

  useEffect(() => {
    loadList();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate || !endDate) {
      setMessage({ type: "err", text: "시작일과 종료일을 선택해주세요." });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          startDate: new Date(startDate).toISOString().slice(0, 10),
          endDate: new Date(endDate).toISOString().slice(0, 10),
          reason: reason.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: "ok", text: "연차 신청이 접수되었습니다." });
        setStartDate("");
        setEndDate("");
        setReason("");
        loadList();
        onSubmitted?.();
      } else {
        setMessage({ type: "err", text: json.error?.message || "신청 실패" });
      }
    } finally {
      setSubmitting(false);
    }
  }

  const statusLabel: Record<string, string> = {
    pending: "대기",
    approved: "승인",
    rejected: "반려",
    cancelled: "취소",
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <h2 className="font-semibold text-slate-800 p-4 border-b border-slate-100">
        연차 신청
      </h2>
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 text-sm text-slate-600">
        올해 사용 <span className="font-semibold text-slate-800">{used}일</span>
        {" / "}
        잔여 <span className="font-semibold text-blue-600">{remaining}일</span>
        <span className="text-slate-500 ml-1">(연간 {ANNUAL_LEAVE_DAYS}일)</span>
      </div>
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">시작일</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">종료일</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">사유 (선택)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="사유를 입력하세요"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            rows={2}
          />
        </div>
        {message && (
          <p
            className={`text-sm ${message.type === "ok" ? "text-emerald-600" : "text-red-600"}`}
          >
            {message.text}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="min-h-[44px] px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium text-base touch-manipulation"
        >
          {submitting ? "신청 중..." : "연차 신청"}
        </button>
      </form>
      {list.length > 0 && (
        <div className="border-t border-slate-100 p-4">
          <h3 className="text-sm font-medium text-slate-700 mb-2">내 연차 신청 내역</h3>
          <ul className="space-y-2">
            {list.slice(0, 5).map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between text-sm text-slate-600"
              >
                <span>
                  {format(new Date(l.startDate), "yyyy-MM-dd", { locale: ko })} ~{" "}
                  {format(new Date(l.endDate), "yyyy-MM-dd", { locale: ko })}
                  {l.reason && ` · ${l.reason}`}
                </span>
                <span
                  className={`font-medium ${
                    l.status === "approved"
                      ? "text-emerald-600"
                      : l.status === "rejected"
                        ? "text-red-600"
                        : l.status === "pending"
                          ? "text-amber-600"
                          : "text-slate-500"
                  }`}
                >
                  {statusLabel[l.status] ?? l.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
