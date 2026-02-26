"use client";

import { useState, useEffect, FormEvent } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

type AnnouncementAttachment = {
  url: string;
  fileName?: string;
  mimeType?: string;
};

type AnnouncementItem = {
  id: string;
  type: string;
  title: string;
  content: string | null;
  targetType: string;
  targetTeamId: string | null;
  eventDate: string | null;
  attachments: AnnouncementAttachment[] | null;
  creatorName: string | null;
  createdAt: string;
};

export default function AnnouncementsList({ canCreate = true }: { canCreate?: boolean }) {
  const [list, setList] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [type, setType] = useState<"notice" | "company_event">("notice");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/announcements", { credentials: "include" })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setList(
            json.data.map((a: any) => ({
              id: a.id,
              type: a.type,
              title: a.title,
              content: a.content ?? null,
              targetType: a.targetType,
              targetTeamId: a.targetTeamId ?? null,
              eventDate: a.eventDate ? String(a.eventDate) : null,
              attachments: (a.attachments as AnnouncementAttachment[] | null) ?? [],
              creatorName: a.creatorName ?? null,
              createdAt: String(a.createdAt),
            }))
          );
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setType("notice");
    setTitle("");
    setContent("");
    setEventDate("");
    setFiles(null);
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("제목을 입력해주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("type", type);
      formData.append("title", title.trim());
      if (content.trim()) formData.append("content", content.trim());
      // 대상은 우선 전체 대상으로만 사용
      formData.append("targetType", "all");
      if (eventDate) formData.append("eventDate", eventDate);
      if (files) {
        Array.from(files).forEach((file) => {
          formData.append("files", file);
        });
      }
      const res = await fetch("/api/announcements", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error?.message || "등록에 실패했습니다.");
        return;
      }
      setModalOpen(false);
      resetForm();
      load();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <p className="text-sm text-slate-600">등록한 공지 목록입니다. 캘린더에도 표시됩니다.</p>
        {canCreate && (
          <button
            type="button"
            onClick={() => {
              resetForm();
              setModalOpen(true);
            }}
            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs md:text-sm font-medium hover:bg-blue-700"
          >
            공지 작성
          </button>
        )}
      </div>
      {loading ? (
        <div className="p-8 text-center text-slate-500">로딩 중...</div>
      ) : list.length === 0 ? (
        <div className="p-8 text-center text-slate-500">등록된 공지가 없습니다.</div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {list.map((a) => (
            <li key={a.id} className="p-4 hover:bg-slate-50">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-slate-800">{a.title}</h3>
                  {a.eventDate && (
                    <p className="text-xs text-slate-500 mt-1">
                      일정: {format(new Date(a.eventDate), "yyyy년 M월 d일", { locale: ko })}
                    </p>
                  )}
                  {a.content && <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{a.content}</p>}
                  {a.attachments && a.attachments.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {a.attachments.map((file, idx) => (
                        <a
                          key={file.url + idx}
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                        >
                          <span>📎</span>
                          <span>{file.fileName || file.url.split("/").pop()}</span>
                        </a>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-slate-400 mt-2">
                    {format(new Date(a.createdAt), "yyyy-MM-dd HH:mm", { locale: ko })}
                  </p>
                </div>
                {a.creatorName && (
                  <span className="shrink-0 text-sm text-slate-500" title="작성자">
                    {a.creatorName}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">공지 작성</h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none px-1"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">제목</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="공지 제목을 입력하세요."
                  />
                </div>
                <div className="w-32">
                  <label className="block text-xs font-medium text-slate-600 mb-1">구분</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as "notice" | "company_event")}
                    className="w-full rounded-lg border border-slate-300 px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="notice">공지</option>
                    <option value="company_event">회사 일정</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">내용</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="공지 내용을 입력하세요."
                />
              </div>

              <div className="flex gap-3 items-center">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">일정 (선택)</label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">첨부 파일 (선택)</label>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setFiles(e.target.files)}
                    className="block w-full text-xs text-slate-600 file:mr-2 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">파일당 최대 10MB, 여러 개 선택 가능</p>
                </div>
              </div>

              {error && <p className="text-xs text-red-600">{error}</p>}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-60"
                >
                  {submitting ? "저장 중..." : "저장"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
