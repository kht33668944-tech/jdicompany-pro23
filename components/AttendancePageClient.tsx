"use client";

import { useState, useEffect } from "react";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ko } from "date-fns/locale";

type Team = { id: string; name: string };

type Row = {
  id: string;
  userId: string;
  userName: string;
  teamName: string | null;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  workMinutes: number | null;
};

const todayStr = () => format(new Date(), "yyyy-MM-dd");

export default function AttendancePageClient({
  teams,
  isCEO,
}: {
  teams: Team[];
  isCEO: boolean;
}) {
  const [from, setFrom] = useState(todayStr);
  const [to, setTo] = useState(todayStr);
  const [teamId, setTeamId] = useState("");
  const [data, setData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const setRangePreset = (preset: "today" | "week" | "month") => {
    const now = new Date();
    if (preset === "today") {
      setFrom(todayStr());
      setTo(todayStr());
    } else if (preset === "week") {
      const start = startOfWeek(now, { weekStartsOn: 1 });
      const end = endOfWeek(now, { weekStartsOn: 1 });
      setFrom(format(start, "yyyy-MM-dd"));
      setTo(format(end, "yyyy-MM-dd"));
    } else {
      setFrom(format(startOfMonth(now), "yyyy-MM-dd"));
      setTo(format(endOfMonth(now), "yyyy-MM-dd"));
    }
  };

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ from, to });
    if (teamId) params.set("teamId", teamId);
    fetch(`/api/attendance?${params}`, { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setData(j.data);
      })
      .finally(() => setLoading(false));
  }, [from, to, teamId]);

  const formatTime = (d: string | null) =>
    d ? format(new Date(d), "HH:mm", { locale: ko }) : "-";
  const formatWork = (mins: number | null) =>
    mins != null ? `${Math.floor(mins / 60)}h ${mins % 60}m` : "-";

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">기간</span>
          <button
            type="button"
            onClick={() => setRangePreset("today")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${from === to && from === todayStr() ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >
            오늘
          </button>
          <button
            type="button"
            onClick={() => setRangePreset("week")}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            이번 주
          </button>
          <button
            type="button"
            onClick={() => setRangePreset("month")}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            이번 달
          </button>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">직접 선택</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm"
          />
          <span className="text-slate-400">~</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm"
          />
        </div>
        {isCEO && teams.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">팀</label>
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm"
            >
              <option value="">전체</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left py-3 px-4 font-medium text-slate-700">이름</th>
              {isCEO && (
                <th className="text-left py-3 px-4 font-medium text-slate-700">팀</th>
              )}
              <th className="text-left py-3 px-4 font-medium text-slate-700">날짜</th>
              <th className="text-left py-3 px-4 font-medium text-slate-700">출근</th>
              <th className="text-left py-3 px-4 font-medium text-slate-700">퇴근</th>
              <th className="text-left py-3 px-4 font-medium text-slate-700">근무시간</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={isCEO ? 6 : 5} className="py-8 text-center text-slate-500">
                  로딩 중...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={isCEO ? 6 : 5} className="py-8 text-center text-slate-500">
                  기록이 없습니다.
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-800">{row.userName}</td>
                  {isCEO && (
                    <td className="py-3 px-4 text-slate-600">{row.teamName ?? "-"}</td>
                  )}
                  <td className="py-3 px-4 text-slate-600">
                    {format(new Date(row.date), "yyyy-MM-dd (EEE)", { locale: ko })}
                  </td>
                  <td className="py-3 px-4">{formatTime(row.checkIn)}</td>
                  <td className="py-3 px-4">{formatTime(row.checkOut)}</td>
                  <td className="py-3 px-4">{formatWork(row.workMinutes)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
