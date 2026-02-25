"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { STATUS_LABELS } from "./ProgressGauge";
import TaskDetailModal from "./TaskDetailModal";

type TaskItem = {
  id: string;
  title: string;
  dueDate: string;
  status: string;
  priority: string;
  assigneeName: string;
  teamName: string;
  projectName: string | null;
};

type TaskListModalProps = {
  initialStatus?: string;
  onClose: () => void;
};

export default function TaskListModal({ initialStatus = "", onClose }: TaskListModalProps) {
  const [status, setStatus] = useState(initialStatus || "");
  const [teamId, setTeamId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [items, setItems] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/teams", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => { if (j.success) setTeams(j.data); });
  }, []);

  useEffect(() => {
    if (!teamId) {
      setProjects([]);
      return;
    }
    fetch(`/api/projects?teamId=${teamId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((j) => { if (j.success) setProjects(j.data); });
  }, [teamId]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status === "overdue") {
      params.set("overdueOnly", "true");
    } else if (status) {
      params.set("status", status);
    }
    if (teamId) params.set("teamId", teamId);
    if (projectId) params.set("projectId", projectId);
    params.set("teamScope", "true");
    fetch(`/api/dashboard/items?${params}`, { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setItems(j.data);
        else setItems([]);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [status, teamId, projectId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-semibold text-slate-800">업무 리스트</h2>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-700">
            ✕
          </button>
        </div>
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-2 py-1.5"
          >
            <option value="">상태 전체</option>
            <option value="todo">준비중</option>
            <option value="in_progress">진행중</option>
            <option value="done">완료</option>
            <option value="on_hold">보류</option>
            <option value="overdue">지연</option>
          </select>
          <select
            value={teamId}
            onChange={(e) => { setTeamId(e.target.value); setProjectId(""); }}
            className="text-sm border border-slate-300 rounded-lg px-2 py-1.5"
          >
            <option value="">팀 전체</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-2 py-1.5"
          >
            <option value="">프로젝트 전체</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-slate-500 text-sm">로딩 중...</p>
          ) : items.length === 0 ? (
            <p className="text-slate-500 text-sm">해당 조건의 업무가 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {items.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setDetailId(t.id)}
                    className="w-full text-left p-3 rounded-xl border border-slate-200 hover:bg-slate-50 flex flex-wrap items-center gap-2"
                  >
                    <span className="text-sm font-medium text-slate-800 flex-1 min-w-0">
                      {t.title}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {STATUS_LABELS[t.status] || t.status}
                    </span>
                    <span className="text-xs text-slate-500">{t.assigneeName}</span>
                    <span className="text-xs text-slate-500">{t.teamName}</span>
                    {t.projectName && (
                      <span className="text-xs text-slate-400">{t.projectName}</span>
                    )}
                    <span className="text-xs text-slate-500">
                      {format(new Date(t.dueDate), "M/d", { locale: ko })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {detailId && (
        <TaskDetailModal
          taskId={detailId}
          onClose={() => setDetailId(null)}
          onUpdated={() => setDetailId(null)}
        />
      )}
    </div>
  );
}
