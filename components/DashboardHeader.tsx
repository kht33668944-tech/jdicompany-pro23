"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { registerPushSubscription } from "@/lib/push-client";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

type NotificationPermission = "default" | "granted" | "denied";

export default function DashboardHeader({ userName }: { userName: string }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [registering, setRegistering] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission as NotificationPermission);
    }
  }, []);

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

  const markAsRead = (id: string) => {
    fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ isRead: true }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
        }
      })
      .catch(() => {});
  };

  const handleEnablePush = async () => {
    if (!("Notification" in window)) return;
    setPushError(null);
    setRegistering(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        if (perm === "denied") {
          setPushError("브라우저에서 알림이 차단되었습니다. 설정에서 허용해 주세요.");
        }
        return;
      }
      const result = await registerPushSubscription();
      if (!result.ok) setPushError(result.error ?? "등록에 실패했습니다.");
    } finally {
      setRegistering(false);
    }
  };

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
              {permission !== "granted" && typeof window !== "undefined" && "Notification" in window && (
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                  <p className="text-xs text-slate-600 mb-2">
                    푸시 알림을 켜면 이 기기로 채팅·업무 알림을 받을 수 있습니다.
                  </p>
                  {permission === "denied" && (
                    <p className="text-xs text-amber-700 mb-2">
                      브라우저 설정 → 사이트 설정 → 알림에서 이 사이트를 허용해 주세요.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleEnablePush}
                    disabled={registering}
                    className="w-full py-2 px-3 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 touch-manipulation"
                  >
                    {registering ? "등록 중…" : "알림 켜기"}
                  </button>
                  {pushError && (
                    <p className="text-xs text-red-600 mt-2">{pushError}</p>
                  )}
                </div>
              )}
              {permission === "granted" && (
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs text-slate-500">푸시 알림이 켜져 있습니다.</p>
                </div>
              )}
              {notifications.length === 0 ? (
                <p className="px-4 py-6 text-sm text-slate-500">알림이 없습니다.</p>
              ) : (
                <ul className="py-1">
                  {notifications.slice(0, 10).map((n) => (
                    <li key={n.id}>
                      <Link
                        href={n.link || "#"}
                        onClick={() => {
                          if (!n.isRead) markAsRead(n.id);
                          setOpen(false);
                        }}
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
