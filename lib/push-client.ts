"use client";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}

/**
 * 푸시 구독 등록. Notification.permission === "granted" 상태에서 호출.
 * 브라우저에서 "알림 켜기" 버튼 클릭 시 사용.
 */
export async function registerPushSubscription(): Promise<{ ok: boolean; error?: string }> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, error: "이 브라우저는 푸시를 지원하지 않습니다." };
  }
  try {
    const res = await fetch("/api/push/vapid", { credentials: "include" });
    const json = await res.json();
    const publicKey = json?.data?.publicKey;
    if (!publicKey) return { ok: false, error: "서버 설정을 확인해 주세요." };

    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await reg.update();

    const keyBytes = urlBase64ToUint8Array(publicKey);
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes.buffer as ArrayBuffer,
    });

    const sub = subscription.toJSON();
    const subRes = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ endpoint: sub.endpoint, keys: sub.keys }),
    });
    if (!subRes.ok) return { ok: false, error: "구독 등록에 실패했습니다." };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message || "등록에 실패했습니다." };
  }
}
