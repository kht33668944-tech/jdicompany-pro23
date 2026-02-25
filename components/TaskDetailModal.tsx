"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

type TaskDetail = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  status: string;
  priority: string;
  assigneeId: string;
  assigneeName: string;
  teamId: string;
  teamName: string;
  createdBy: string;
  creatorName: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  comments: { id: string; content: string; userId: string; userName: string; createdAt: string }[];
  histories: { id: string; field: string; oldValue: string | null; newValue: string | null; userId: string; userName: string; createdAt: string }[];
};

const STATUS_LABEL: Record<string, string> = {
  todo: "할 일",
  in_progress: "진행중",
  done: "완료",
  on_hold: "보류",
  cancelled: "취소",
};

const FIELD_LABEL: Record<string, string> = {
  status: "상태",
  assignee: "담당자",
  priority: "우선순위",
};

export default function TaskDetailModal({
  taskId,
  onClose,
  onUpdated,
}: {
  taskId: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentContent, setCommentContent] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingAssignee, setUpdatingAssignee] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string }[]>([]);
  const [canChangeAssignee, setCanChangeAssignee] = useState(false);

  const fetchTask = () => {
    fetch(`/api/tasks/${taskId}`, { credentials: "include" })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setTask(json.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    fetchTask();
  }, [taskId]);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.data) {
          const role = j.data.role;
          setCanChangeAssignee(role === "CEO" || role === "TEAM_LEADER");
        }
      });
  }, []);

  useEffect(() => {
    if (!task?.teamId || !canChangeAssignee) return;
    fetch(`/api/users?teamId=${task.teamId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (j.success && Array.isArray(j.data)) setTeamMembers(j.data.map((u: { id: string; name: string }) => ({ id: u.id, name: u.name })));
      })
      .catch(() => setTeamMembers([]));
  }, [task?.teamId, canChangeAssignee]);

  async function handleStatusChange(newStatus: string) {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchTask();
        onUpdated();
      }
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleAssigneeChange(newAssigneeId: string) {
    if (!task || newAssigneeId === task.assigneeId) return;
    setUpdatingAssignee(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ assigneeId: newAssigneeId }),
      });
      if (res.ok) {
        fetchTask();
        onUpdated();
      }
    } finally {
      setUpdatingAssignee(false);
    }
  }

  async function handleDelete() {
    if (!confirm("이 업무를 삭제할까요?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        onUpdated();
        onClose();
      }
    } finally {
      setDeleting(false);
    }
  }

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentContent.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: commentContent.trim() }),
      });
      if (res.ok) {
        setCommentContent("");
        fetchTask();
      }
    } finally {
      setSubmittingComment(false);
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
          <p className="text-slate-500">로딩 중...</p>
        </div>
      </div>
    );
  }
  if (!task) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
          <p className="text-slate-500">할 일을 찾을 수 없습니다.</p>
          <button type="button" onClick={onClose} className="mt-4 text-blue-600 hover:underline">닫기</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">{task.title}</h2>
            <p className="text-sm text-slate-500 mt-1">
              {task.teamName} · {task.assigneeName} · 마감 {format(new Date(task.dueDate), "yyyy-MM-dd (EEE)", { locale: ko })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
            >
              삭제
            </button>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">상태</label>
            <select
              value={task.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={updatingStatus}
              className="px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="todo">할 일</option>
              <option value="in_progress">진행중</option>
              <option value="done">완료</option>
              <option value="on_hold">보류</option>
              <option value="cancelled">취소</option>
            </select>
          </div>

          {canChangeAssignee && teamMembers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">담당자</label>
              <select
                value={task.assigneeId}
                onChange={(e) => handleAssigneeChange(e.target.value)}
                disabled={updatingAssignee}
                className="px-3 py-2 border border-slate-300 rounded-lg w-full max-w-xs"
              >
                {teamMembers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}

          {task.description && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">설명</label>
              <p className="text-slate-700 whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          <div>
            <h3 className="font-medium text-slate-800 mb-2">댓글</h3>
            <form onSubmit={handleSubmitComment} className="flex gap-2 mb-3">
              <input
                type="text"
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="댓글 입력"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
              />
              <button
                type="submit"
                disabled={submittingComment || !commentContent.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                등록
              </button>
            </form>
            <ul className="space-y-2">
              {task.comments.length === 0 ? (
                <li className="text-slate-500 text-sm">댓글이 없습니다.</li>
              ) : (
                task.comments.map((c) => (
                  <li key={c.id} className="text-sm border-l-2 border-slate-200 pl-3 py-1">
                    <span className="font-medium text-slate-700">{c.userName}</span>
                    <span className="text-slate-400 text-xs ml-2">{format(new Date(c.createdAt), "M/d HH:mm", { locale: ko })}</span>
                    <p className="text-slate-600 mt-0.5">{c.content}</p>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-slate-800 mb-2">변경 히스토리</h3>
            <ul className="space-y-2">
              {task.histories.length === 0 ? (
                <li className="text-slate-500 text-sm">변경 이력이 없습니다.</li>
              ) : (
                task.histories.map((h) => (
                  <li key={h.id} className="text-sm flex gap-2 items-start">
                    <span className="text-slate-400 shrink-0">{format(new Date(h.createdAt), "M/d HH:mm", { locale: ko })}</span>
                    <span className="text-slate-600">
                      <span className="font-medium">{h.userName}</span>님이 {FIELD_LABEL[h.field] ?? h.field}를
                      {h.oldValue ? ` ${h.oldValue}` : ""} → {h.newValue ?? ""}(으)로 변경
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
