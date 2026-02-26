"use client";

import { useEffect, useRef } from "react";
import { registerPushSubscription } from "@/lib/push-client";

/** 대시보드 마운트 시 자동으로 푸시 구독 시도. 권한이 "default"일 때만 요청. */
export default function PushRegistration() {
  const done = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (done.current) return;

    let cancelled = false;

    (async () => {
      try {
        if (Notification.permission !== "default" || cancelled) return;
        const permission = await Notification.requestPermission();
        if (permission !== "granted" || cancelled) return;
        const result = await registerPushSubscription();
        if (result.ok) done.current = true;
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
