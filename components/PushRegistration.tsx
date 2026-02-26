"use client";

import { useEffect, useRef } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}

export default function PushRegistration() {
  const done = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (done.current) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/push/vapid");
        const json = await res.json();
        const publicKey = json?.data?.publicKey;
        if (!publicKey || cancelled) return;

        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        await reg.update();

        let permission = Notification.permission;
        if (permission === "default") {
          permission = await Notification.requestPermission();
        }
        if (permission !== "granted" || cancelled) return;

        const keyBytes = urlBase64ToUint8Array(publicKey);
        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyBytes.buffer as ArrayBuffer,
        });

        const sub = subscription.toJSON();
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            endpoint: sub.endpoint,
            keys: sub.keys,
          }),
        });
        done.current = true;
      } catch {
        // ignore (no push support or user denied)
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
