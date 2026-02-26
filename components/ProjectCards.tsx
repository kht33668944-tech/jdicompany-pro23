"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

type Project = {
  id: string;
  name: string;
  description?: string | null;
  teamId: string;
  startDate?: string | null;
  endDate?: string | null;
  status: string;
  taskCount: number;
  doneCount: number;
  progressPercent: number;
};

export default function ProjectCards({
  teamId,
  canCreate,
  onCreateClick,
  refreshKey = 0,
}: {
  teamId: string;
  canCreate: boolean;
  onCreateClick: () => void;
  refreshKey?: number;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/projects?teamId=${teamId}&status=active`, { credentials: "include" })
      .then((r) => r.json())
      .then((j) => { if (j.success) setProjects(j.data); })
      .finally(() => setLoading(false));
  }, [teamId, refreshKey]);
  const dDay = (end: string | null | undefined) => {
    if (!end) return null;
    const endDate = new Date(end);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    const diff = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return `D+${Math.abs(diff)}`;
    if (diff === 0) return "D-Day";
    return `D-${diff}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-slate-800 sm:text-xl">프로젝트</h2>
        {canCreate && (
          <button
            type="button"
            onClick={onCreateClick}
            className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 sm:w-auto"
          >
            새 프로젝트
          </button>
        )}
      </div>
      {loading ? (
        <p className="text-sm text-slate-500">로딩 중...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/teams/${teamId}/projects/${p.id}`}
              className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="min-w-0 flex-1 font-semibold text-slate-800 truncate">{p.name}</h3>
                {p.endDate && (
                  <span className="shrink-0 text-xs font-medium text-amber-600">
                    {dDay(p.endDate)}
                  </span>
                )}
              </div>
              {(p.startDate || p.endDate) && (
                <p className="mt-1 text-xs text-slate-500">
                  {p.startDate && format(new Date(p.startDate), "yyyy.MM.dd", { locale: ko })}
                  {p.startDate && p.endDate && " ~ "}
                  {p.endDate && format(new Date(p.endDate), "yyyy.MM.dd", { locale: ko })}
                </p>
              )}
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-slate-500">진행률</span>
                  <span className="font-medium text-slate-700">
                    {p.doneCount}/{p.taskCount}건 ({p.progressPercent}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${Math.min(100, p.progressPercent)}%` }}
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
