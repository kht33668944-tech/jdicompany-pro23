"use client";

import { useState, useRef } from "react";

type Props = {
  initialName: string;
  initialAvatarUrl: string | null;
  onUpdate?: (data: { name: string; avatarUrl: string | null }) => void;
};

export default function ProfileEditForm({
  initialName,
  initialAvatarUrl,
  onUpdate,
}: Props) {
  const [name, setName] = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl || "");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!name.trim()) {
      setMessage({ type: "err", text: "이름을 입력해주세요." });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          avatarUrl: avatarUrl.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "ok", text: "프로필이 저장되었습니다." });
        onUpdate?.({ name: data.data.name, avatarUrl: data.data.avatarUrl });
      } else {
        setMessage({ type: "err", text: data.error?.message || "저장에 실패했습니다." });
      }
    } catch {
      setMessage({ type: "err", text: "네트워크 오류" });
    } finally {
      setLoading(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setUploading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch("/api/upload/avatar", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.data?.url) {
        setAvatarUrl(data.data.url);
        setMessage({ type: "ok", text: "프로필 이미지를 업로드했습니다. 저장 버튼을 눌러 반영하세요." });
      } else {
        setMessage({ type: "err", text: data.error?.message || "업로드 실패" });
      }
    } catch {
      setMessage({ type: "err", text: "업로드 오류" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center gap-2">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="프로필"
              className="w-20 h-20 rounded-full object-cover border border-slate-200"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-2xl font-medium">
              {name.charAt(0) || "?"}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-sm text-blue-600 hover:underline disabled:opacity-50"
          >
            {uploading ? "업로드 중..." : "사진 변경"}
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <label htmlFor="profile-name" className="block text-sm text-slate-600 mb-1">표시 이름</label>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            placeholder="이름"
          />
        </div>
      </div>
      {message && (
        <p className={message.type === "ok" ? "text-green-600 text-sm" : "text-red-600 text-sm"}>
          {message.text}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "저장 중..." : "저장"}
      </button>
    </form>
  );
}
