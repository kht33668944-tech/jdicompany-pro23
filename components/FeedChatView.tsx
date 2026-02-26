"use client";

import { useRef, useEffect } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";

export type FeedItem = {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl: string | null;
  content: string;
  attachments: { type: "image" | "video"; url: string; fileName?: string }[];
  reactions: Record<string, number>;
  readCount: number;
  createdAt: string;
};

const REACTION_EMOJIS = ["👍", "✓", "💬", "❤️"];
const GROUP_THRESHOLD_MS = 3 * 60 * 1000; // 3분 이내 연속 메시지 그룹화

function Avatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const initial = name?.trim().slice(0, 1).toUpperCase() || "?";
  return (
    <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs font-medium text-slate-500">
          {initial}
        </div>
      )}
    </div>
  );
}

export default function FeedChatView({
  items,
  myId,
  onReaction,
}: {
  items: FeedItem[];
  myId: string | null;
  onReaction: (postId: string, emoji: string) => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [items.length]);

  if (items.length === 0) return null;

  // API는 최신순(desc)으로 주므로, 채팅은 오래된 순(위) → 최신(아래)으로 표시하기 위해 오름차순 정렬
  const sortedItems = [...items].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const withDateKeys = sortedItems.map((post) => ({
    ...post,
    dateKey: format(new Date(post.createdAt), "yyyy-MM-dd"),
    dateLabel: format(new Date(post.createdAt), "yyyy년 M월 d일 EEEE", { locale: ko }),
    ts: new Date(post.createdAt).getTime(),
  }));

  const groups: { dateKey: string; dateLabel: string; posts: typeof withDateKeys }[] = [];
  let current: typeof groups[0] | null = null;
  for (const post of withDateKeys) {
    if (!current || current.dateKey !== post.dateKey) {
      current = { dateKey: post.dateKey, dateLabel: post.dateLabel, posts: [] };
      groups.push(current);
    }
    current.posts.push(post);
  }

  return (
    <div className="flex flex-col gap-4 pb-2">
      {groups.map((g) => (
        <div key={g.dateKey} className="space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[11px] text-slate-400 sm:text-xs">{g.dateLabel}</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          {g.posts.map((post, idx) => {
            const prev = g.posts[idx - 1];
            const isConsecutive =
              prev &&
              prev.userId === post.userId &&
              post.ts - prev.ts <= GROUP_THRESHOLD_MS;
            const isMine = myId !== null && post.userId === myId;

            return (
              <div
                key={post.id}
                className={cn(
                  "group flex gap-2",
                  isMine ? "flex-row-reverse" : "flex-row",
                  isConsecutive && (isMine ? "mt-0.5" : "mt-0.5")
                )}
              >
                {!isMine && (
                  <div className="flex w-8 flex-shrink-0 justify-center">
                    {isConsecutive ? (
                      <div className="w-8" />
                    ) : (
                      <Avatar name={post.userName} avatarUrl={post.userAvatarUrl} />
                    )}
                  </div>
                )}
                <div
                  className={cn(
                    "flex max-w-[85%] flex-col sm:max-w-[75%]",
                    isMine ? "items-end" : "items-start"
                  )}
                >
                  {!isMine && !isConsecutive && (
                    <span className="mb-0.5 ml-1 text-[11px] font-medium text-slate-500 sm:text-xs">
                      {post.userName}
                    </span>
                  )}
                  <div
                    className={cn(
                      "rounded-2xl px-3 py-2 shadow-sm",
                      isMine
                        ? "bg-blue-100 text-slate-800"
                        : "border border-slate-200 bg-white text-slate-800",
                      isConsecutive && (isMine ? "rounded-tr-md" : "rounded-tl-md")
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words text-sm">{post.content}</p>
                    {post.attachments?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {post.attachments.map((att, i) =>
                          att.type === "image" ? (
                            <a
                              key={i}
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <img
                                src={att.url}
                                alt={att.fileName || "첨부"}
                                className="max-h-48 max-w-full rounded-lg object-contain"
                              />
                            </a>
                          ) : (
                            <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                              <video
                                src={att.url}
                                controls
                                className="max-h-48 max-w-full"
                                preload="metadata"
                              />
                              {att.fileName && (
                                <p className="truncate px-2 py-1 text-xs text-slate-500">
                                  {att.fileName}
                                </p>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                  <div
                    className={cn(
                      "mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-400",
                      isMine ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    {post.readCount > 0 && (
                      <span className="text-slate-400">읽음 {post.readCount}</span>
                    )}
                    <span>
                      {format(new Date(post.createdAt), "a h:mm", { locale: ko })}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1">
                    {Object.entries(post.reactions || {}).map(([emoji, count]) =>
                      count > 0 ? (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => onReaction(post.id, emoji)}
                          className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs hover:bg-slate-200"
                        >
                          {emoji} {count}
                        </button>
                      ) : null
                    )}
                    <span className="inline-flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      {REACTION_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => onReaction(post.id, emoji)}
                          className="rounded p-0.5 text-sm hover:bg-slate-100"
                          title={emoji}
                        >
                          {emoji}
                        </button>
                      ))}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
