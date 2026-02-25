"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

type TodayRecord = {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
};

export default function AttendanceButtons() {
  const [today, setToday] = useState<TodayRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadToday = () => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    fetch(`/api/attendance?from=${todayStr}&to=${todayStr}`, { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (j.success && Array.isArray(j.data)) {
          const recordDateStr = (d: { date?: string | Date }) =>
            typeof d.date === "string" ? d.date.slice(0, 10) : d.date ? format(new Date(d.date), "yyyy-MM-dd") : "";
          const todayRecord = j.data.find((d: { date?: string | Date }) => recordDateStr(d) === todayStr);
          if (todayRecord) {
            setToday({
              id: todayRecord.id,
              date: todayRecord.date,
              checkIn: todayRecord.checkIn ?? null,
              checkOut: todayRecord.checkOut ?? null,
            });
          } else {
            setToday(null);
          }
        } else {
          setToday(null);
        }
      })
      .catch(() => setToday(null));
  };

  useEffect(() => {
    loadToday();
  }, []);

  async function handleCheck(action: "in" | "out") {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/attendance/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (json.success) {
        loadToday();
      } else {
        setError(json.error?.message || "처리 실패");
      }
    } finally {
      setLoading(false);
    }
  }

  const canCheckIn = !today?.checkIn;
  const canCheckOut = today?.checkIn && !today?.checkOut;

  const todaySummary =
    today?.checkIn && today.checkOut
      ? `오늘 ${format(new Date(today.checkIn), "HH:mm", { locale: ko })} 출근 · ${format(new Date(today.checkOut), "HH:mm", { locale: ko })} 퇴근`
      : today?.checkIn
        ? `오늘 ${format(new Date(today.checkIn), "HH:mm", { locale: ko })} 출근 · 퇴근 전`
        : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <h2 className="font-semibold text-slate-800 p-4 border-b border-slate-100">
        출퇴근 기록
      </h2>
      {todaySummary && (
        <p className="px-4 py-2 text-sm text-slate-600 bg-slate-50 border-b border-slate-100">
          {todaySummary}
        </p>
      )}
      <div className="p-4 space-y-4">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleCheck("in")}
            disabled={loading || !canCheckIn}
            className="flex-1 min-h-[44px] py-3 rounded-xl font-medium text-base bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          >
            출근
          </button>
          <button
            type="button"
            onClick={() => handleCheck("out")}
            disabled={loading || !canCheckOut}
            className="flex-1 min-h-[44px] py-3 rounded-xl font-medium text-base bg-slate-600 text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          >
            퇴근
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {today && (
          <div className="rounded-xl bg-slate-50 p-4 space-y-2">
            <p className="text-sm font-medium text-slate-700">오늘 출퇴근</p>
            {today.checkIn ? (
              <p className="text-slate-800">
                출근 {format(new Date(today.checkIn), "HH:mm", { locale: ko })}
              </p>
            ) : (
              <p className="text-slate-500">출근 기록 없음</p>
            )}
            {today.checkOut ? (
              <p className="text-slate-800">
                퇴근 {format(new Date(today.checkOut), "HH:mm", { locale: ko })}
              </p>
            ) : today.checkIn ? (
              <p className="text-slate-500">퇴근 전</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
