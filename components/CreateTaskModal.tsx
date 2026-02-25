"use client";

import { useState, useEffect } from "react";

type Project = { id: string; name: string; teamId: string };
type UserOption = { id: string; name: string };

export default function CreateTaskModal({
  teamId,
  initialProjectId,
  onClose,
  onCreated,
}: {
  teamId: string | null;
  initialProjectId?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("normal");
  const [projectId, setProjectId] = useState(initialProjectId || "");
  const [projects, setProjects] = useState<Project[]>([]);
  const [assigneeId, setAssigneeId] = useState("");
  const [teamMembers, setTeamMembers] = useState<UserOption[]>([]);
  const [canAssign, setCanAssign] = useState(false);

  useEffect(() => {
    if (initialProjectId) setProjectId(initialProjectId);
  }, [initialProjectId]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.data) {
          const role = j.data.role;
          setCanAssign(role === "CEO" || role === "TEAM_LEADER");
        }
      });
  }, []);

  useEffect(() => {
    if (!teamId) return;
    fetch(`/api/projects?teamId=${teamId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((j) => { if (j.success) setProjects(j.data); });
  }, [teamId]);

  useEffect(() => {
    if (!teamId || !canAssign) return;
    fetch(`/api/users?teamId=${teamId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (j.success && Array.isArray(j.data)) setTeamMembers(j.data.map((u: { id: string; name: string }) => ({ id: u.id, name: u.name })));
      })
      .catch(() => setTeamMembers([]));
  }, [teamId, canAssign]);

  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    setDueDate(d.toISOString().slice(0, 10));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!title.trim()) { setError("제목을 입력해주세요."); return; }
    if (!dueDate) { setError("마감일을 선택해주세요."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          dueDate,
          priority,
          projectId: projectId || undefined,
          assigneeId: assigneeId || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        onCreated();
        onClose();
      } else {
        setError(json.error?.message || "생성 실패");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">새 업무 추가</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">제목 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              placeholder="업무 제목"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl resize-none"
              rows={3}
              placeholder="설명 (선택)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">마감일 *</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">우선순위</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl"
            >
              <option value="low">낮음</option>
              <option value="normal">보통</option>
              <option value="high">높음</option>
            </select>
          </div>
          {teamId && canAssign && teamMembers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">담당자</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              >
                <option value="">나 (기본)</option>
                {teamMembers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}
          {teamId && projects.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">프로젝트</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              >
                <option value="">선택 안 함</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "추가 중..." : "추가"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-50"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
