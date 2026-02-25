"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import ProgressGauge from "./ProgressGauge";
import { STATUS_COLORS, STATUS_LABELS } from "./ProgressGauge";
import TaskDetailModal from "./TaskDetailModal";
import CreateTaskModal from "./CreateTaskModal";

type TaskItem = {
  id: string;
  title: string;
  dueDate: string;
  status: string;
  priority: string;
  assigneeName: string;
  projectName: string | null;
};

type Project = { id: string; name: string; teamId: string };

const KANBAN_STATUSES = ["todo", "in_progress", "done"] as const;
const PRIORITY_LABEL: Record<string, string> = { high: "높음", normal: "보통", low: "낮음" };
const PRIORITY_CLASS: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  normal: "bg-slate-100 text-slate-600",
  low: "bg-slate-50 text-slate-500",
};

export default function TeamKanban({
  teamId,
  teamName,
}: {
  teamId: string;
  teamName: string;
}) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectFilter, setProjectFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);

  const fetchTasks = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ teamId, teamScope: "true" });
    if (projectFilter) params.set("projectId", projectFilter);
    fetch(`/api/tasks?${params}`, { credentials: "include" })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setTasks(json.data);
      })
      .finally(() => setLoading(false));
  }, [teamId, projectFilter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    fetch(`/api/projects?teamId=${teamId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((j) => { if (j.success) setProjects(j.data); });
  }, [teamId]);

  const activeTasks = tasks.filter((t) => t.status !== "cancelled");
  const todoCount = activeTasks.filter((t) => t.status === "todo").length;
  const inProgressCount = activeTasks.filter((t) => t.status === "in_progress").length;
  const doneCount = activeTasks.filter((t) => t.status === "done").length;
  const total = activeTasks.length;
  const progressPercent = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const byStatus = (status: string) =>
    tasks.filter((t) => t.status === status && t.status !== "cancelled");

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-semibold text-slate-800 mb-2">{teamName} 진행률</h2>
        <ProgressGauge
          todoCount={todoCount}
          inProgressCount={inProgressCount}
          doneCount={doneCount}
          progressPercent={progressPercent}
          height="lg"
          showLegend={true}
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm font-medium text-slate-600">프로젝트</span>
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-xl text-sm"
        >
          <option value="">전체 (팀 전체 업무)</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setCreateTaskOpen(true)}
          className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium"
        >
          새 업무 추가
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500 py-8 text-center">로딩 중...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {KANBAN_STATUSES.map((status) => (
            <div
              key={status}
              className="bg-slate-50 rounded-2xl border border-slate-200 p-4 min-h-[320px]"
            >
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`w-2 h-2 rounded-full ${STATUS_COLORS[status] || "bg-slate-400"}`}
                />
                <span className="font-medium text-slate-700">
                  {STATUS_LABELS[status]} ({byStatus(status).length})
                </span>
              </div>
              <div className="space-y-2">
                {byStatus(status).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setDetailTaskId(t.id)}
                    title={t.title}
                    className="w-full text-left bg-white rounded-xl border border-slate-200 p-3 shadow-sm hover:shadow hover:border-slate-300 transition-all"
                  >
                    <p className="font-medium text-slate-800 line-clamp-2 break-words" title={t.title}>{t.title}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                      <span className="text-slate-500">{t.assigneeName}</span>
                      <span className={`px-1.5 py-0.5 rounded ${PRIORITY_CLASS[t.priority]}`}>
                        {PRIORITY_LABEL[t.priority]}
                      </span>
                      {t.projectName && (
                        <span className="text-slate-500">{t.projectName}</span>
                      )}
                      <span className="text-slate-500">
                        {format(new Date(t.dueDate), "M/d", { locale: ko })}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {detailTaskId && (
        <TaskDetailModal
          taskId={detailTaskId}
          onClose={() => setDetailTaskId(null)}
          onUpdated={() => {
            fetchTasks();
            setDetailTaskId(null);
          }}
        />
      )}
      {createTaskOpen && (
        <CreateTaskModal
          teamId={teamId}
          initialProjectId={projectFilter || undefined}
          onClose={() => setCreateTaskOpen(false)}
          onCreated={() => {
            fetchTasks();
            setCreateTaskOpen(false);
          }}
        />
      )}
    </div>
  );
}
