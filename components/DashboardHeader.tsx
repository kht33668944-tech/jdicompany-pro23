"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

export default function DashboardHeader({ userName }: { userName: string }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/notifications?limit=20", { credentials: "include" })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) setNotifications(json.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-5">
      <div className="max-w-6xl mx-auto flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">
            안녕하세요, {userName}님
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            팀의 최근 업무를 확인하세요.
          </p>
        </div>
        <div className="relative flex-shrink-0" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="relative min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors touch-manipulation"
            aria-label="알림"
          >
            <Bell className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[1.25rem] h-5 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-medium">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
          {open && (
            <div className="absolute right-0 top-full mt-1 w-80 max-h-[20rem] overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1">
              <div className="px-4 py-2 border-b border-slate-100">
                <span className="text-sm font-medium text-slate-700">알림</span>
              </div>
              {notifications.length === 0 ? (
                <p className="px-4 py-6 text-sm text-slate-500">알림이 없습니다.</p>
              ) : (
                <ul className="py-1">
                  {notifications.slice(0, 10).map((n) => (
                    <li key={n.id}>
                      <Link
                        href={n.link || "#"}
                        onClick={() => setOpen(false)}
                        className={`block px-4 py-2.5 text-left text-sm hover:bg-slate-50 ${!n.isRead ? "bg-blue-50/50" : ""}`}
                      >
                        <span className="text-slate-800 font-medium">{n.title}</span>
                        <span className="block text-xs text-slate-500 mt-0.5">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ko })}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
