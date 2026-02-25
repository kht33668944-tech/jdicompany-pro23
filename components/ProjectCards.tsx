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
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">프로젝트</h2>
        {canCreate && (
          <button
            type="button"
            onClick={onCreateClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium text-sm"
          >
            새 프로젝트
          </button>
        )}
      </div>
      {loading ? (
        <p className="text-slate-500 text-sm">로딩 중...</p>
      ) : (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/teams/${teamId}/projects/${p.id}`}
            className="block bg-white rounded-2xl border border-slate-200 shadow-sm p-4 hover:border-slate-300 hover:shadow transition-all"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-slate-800">{p.name}</h3>
              {p.endDate && (
                <span className="text-xs font-medium text-amber-600 shrink-0">
                  {dDay(p.endDate)}
                </span>
              )}
            </div>
            {(p.startDate || p.endDate) && (
              <p className="text-xs text-slate-500 mt-1">
                {p.startDate && format(new Date(p.startDate), "yyyy.MM.dd", { locale: ko })}
                {p.startDate && p.endDate && " ~ "}
                {p.endDate && format(new Date(p.endDate), "yyyy.MM.dd", { locale: ko })}
              </p>
            )}
            <p className="text-xs text-slate-500 mt-2">
              업무 {p.doneCount}/{p.taskCount}건
            </p>
          </Link>
        ))}
      </div>
      )}
    </div>
  );
}
