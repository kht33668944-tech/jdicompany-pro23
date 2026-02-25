"use client";

import { useState } from "react";
import Link from "next/link";
import { Info, ExternalLink } from "lucide-react";
import { STATUS_COLORS } from "./ProgressGauge";
import TaskDetailModal from "./TaskDetailModal";

type TaskItem = { id: string; title: string; status: string };

type TeamBoardData = {
  teamId: string;
  teamName: string;
  progressPercent: number;
  todoCount: number;
  inProgressCount: number;
  doneCount: number;
  todoTasks: TaskItem[];
  inProgressTasks: TaskItem[];
  doneTasks: TaskItem[];
};

export default function TeamBoard({
  team,
  teamHref,
  onTaskUpdated,
}: {
  team: TeamBoardData;
  teamHref?: string;
  onTaskUpdated?: () => void;
}) {
  const [modalTaskId, setModalTaskId] = useState<string | null>(null);

  const renderTaskList = (tasks: TaskItem[]) => (
    <div className="space-y-1">
      {tasks.length === 0 ? (
        <p className="text-xs text-slate-400">없음</p>
      ) : (
        tasks.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setModalTaskId(t.id)}
            title={t.title}
            className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-100 transition-colors group"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_COLORS[t.status] || "bg-slate-400"}`}
            />
            <span className="text-sm text-slate-700 flex-1 min-w-0 truncate" title={t.title}>
              {t.title}
            </span>
          </button>
        ))
      )}
    </div>
  );

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[280px] flex flex-col">
        <div className="p-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              {teamHref ? (
                <Link href={teamHref} className="font-semibold text-slate-800 hover:text-blue-600 hover:underline truncate">
                  {team.teamName}
                </Link>
              ) : (
                <h3 className="font-semibold text-slate-800 truncate">{team.teamName}</h3>
              )}
              <span className="text-slate-400 flex-shrink-0" title="팀 상세로 이동">
                <Info className="w-4 h-4" />
              </span>
            </div>
            {teamHref && (
              <Link
                href={teamHref}
                className="flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                title="팀 페이지로 이동"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">진행률 {team.progressPercent}%</p>
          <div className="mt-3 h-3 rounded-full overflow-hidden flex bg-slate-100">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${team.progressPercent}%` }}
            />
          </div>
        </div>
        <div className="p-4 grid grid-cols-3 gap-4 flex-1 min-h-[200px]">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              준비중 ({team.todoCount})
            </p>
            {renderTaskList(team.todoTasks)}
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              진행중 ({team.inProgressCount})
            </p>
            {renderTaskList(team.inProgressTasks)}
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              완료 ({team.doneCount})
            </p>
            {renderTaskList(team.doneTasks)}
          </div>
        </div>
      </div>
      {modalTaskId && (
        <TaskDetailModal
          taskId={modalTaskId}
          onClose={() => setModalTaskId(null)}
          onUpdated={() => {
            onTaskUpdated?.();
            setModalTaskId(null);
          }}
        />
      )}
    </>
  );
}
