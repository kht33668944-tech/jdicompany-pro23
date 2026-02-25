"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

type AnnouncementItem = {
  id: string;
  type: string;
  title: string;
  content: string | null;
  targetType: string;
  targetTeamId: string | null;
  eventDate: string | null;
  createdAt: string;
};

export default function AnnouncementsList() {
  const [list, setList] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/announcements", { credentials: "include" })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) setList(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center text-slate-500">
        로딩 중...
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center text-slate-500">
        등록된 공지가 없습니다.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <ul className="divide-y divide-slate-100">
        {list.map((a) => (
          <li key={a.id} className="p-4 hover:bg-slate-50">
            <h3 className="font-medium text-slate-800">{a.title}</h3>
            {a.eventDate && (
              <p className="text-xs text-slate-500 mt-1">
                일정: {format(new Date(a.eventDate), "yyyy년 M월 d일", { locale: ko })}
              </p>
            )}
            {a.content && <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{a.content}</p>}
            <p className="text-xs text-slate-400 mt-2">
              {format(new Date(a.createdAt), "yyyy-MM-dd HH:mm", { locale: ko })}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
