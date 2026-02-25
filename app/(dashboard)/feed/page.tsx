"use client";

import { useEffect, useState, useRef } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Search,
  ChevronDown,
  ChevronRight,
  ImagePlus,
  Send,
  Video,
  Users,
  AtSign,
  Paperclip,
  Bold,
  MessageCircle,
  ThumbsUp,
  Check,
  Plus,
  LayoutGrid,
  Menu,
} from "lucide-react";

type AttachmentItem = { type: "image" | "video"; url: string; fileName?: string };

type FeedItem = {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl: string | null;
  content: string;
  attachments: AttachmentItem[];
  reactions: Record<string, number>;
  readCount: number;
  createdAt: string;
};

type Channel = { id: string; name: string; slug: string; sortOrder: number };
type ChannelGroup = { groupName: string; list: Channel[] };

type Room = {
  id: string;
  name: string;
  memberCount: number;
  members: { id: string; name: string; avatarUrl: string | null }[];
};

const REACTION_EMOJIS = ["👍", "✓", "💬", "❤️"];

export default function FeedPage() {
  const [channelGroups, setChannelGroups] = useState<ChannelGroup[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [topicOpen, setTopicOpen] = useState<Record<string, boolean>>({});
  const [items, setItems] = useState<FeedItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [posting, setPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [headerTitle, setHeaderTitle] = useState("소통방");
  const [headerMemberCount, setHeaderMemberCount] = useState<number | null>(null);

  const loadChannels = () => {
    fetch("/api/feed/channels", { credentials: "include" })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.byGroup) {
          setChannelGroups(json.data.byGroup);
          if (!selectedChannelId && !selectedRoomId && json.data.byGroup[0]?.list?.[0]) {
            setSelectedChannelId(json.data.byGroup[0].list[0].id);
          }
        }
      })
      .catch(() => {});
  };

  const loadRooms = () => {
    fetch("/api/feed/rooms", { credentials: "include" })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.rooms) {
          setRooms(json.data.rooms);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadChannels();
    loadRooms();
  }, []);

  const currentChannel = channelGroups.flatMap((g) => g.list).find((c) => c.id === selectedChannelId);
  const currentRoom = rooms.find((r) => r.id === selectedRoomId);

  useEffect(() => {
    if (selectedChannelId) {
      setHeaderTitle(currentChannel?.name ?? "채널");
      setHeaderMemberCount(null);
    } else if (selectedRoomId) {
      setHeaderTitle(currentRoom?.name ?? "대화방");
      setHeaderMemberCount(currentRoom?.memberCount ?? null);
    } else {
      setHeaderTitle("소통방");
      setHeaderMemberCount(null);
    }
  }, [selectedChannelId, selectedRoomId, currentChannel, currentRoom]);

  const fetchFeed = (cursor?: string) => {
    const params = new URLSearchParams({ limit: "20" });
    if (selectedChannelId) params.set("channelId", selectedChannelId);
    if (selectedRoomId) params.set("roomId", selectedRoomId);
    if (cursor) params.set("cursor", cursor);
    const url = `/api/feed?${params.toString()}`;
    setLoading(true);
    fetch(url, { credentials: "include" })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          const list = (json.data?.data ?? json.data ?? []) as FeedItem[];
          const next = json.data?.nextCursor ?? json.nextCursor ?? null;
          if (cursor) setItems((prev) => [...prev, ...list]);
          else setItems(Array.isArray(list) ? list : []);
          setNextCursor(next);
          setError("");
        } else {
          setError(json.error?.message || "로드 실패");
        }
      })
      .catch(() => setError("네트워크 오류"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (selectedChannelId || selectedRoomId) {
      fetchFeed();
    } else {
      setItems([]);
      setNextCursor(null);
      setLoading(false);
    }
  }, [selectedChannelId, selectedRoomId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!content.trim() && files.length === 0) || posting) return;
    if (!selectedChannelId && !selectedRoomId) {
      setError("채널 또는 대화방을 선택해주세요.");
      return;
    }
    setPosting(true);
    const formData = new FormData();
    formData.set("content", content.trim());
    if (selectedChannelId) formData.set("channelId", selectedChannelId);
    if (selectedRoomId) formData.set("roomId", selectedRoomId);
    files.forEach((f) => formData.append("files", f));
    fetch("/api/feed", {
      method: "POST",
      credentials: "include",
      body: formData,
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setContent("");
          setFiles([]);
          fetchFeed();
        } else {
          setError(json.error?.message || "게시 실패");
        }
      })
      .catch(() => setError("네트워크 오류"))
      .finally(() => setPosting(false));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = Array.from(e.target.files || []);
    const allowed = chosen.filter((f) => {
      const t = f.type || "";
      const ok = t.startsWith("image/") || t.startsWith("video/");
      const sizeOk = t.startsWith("image/") ? f.size <= 5 * 1024 * 1024 : f.size <= 50 * 1024 * 1024;
      return ok && sizeOk;
    });
    setFiles((prev) => [...prev, ...allowed].slice(-10));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index));

  const markRead = (postId: string) => {
    fetch(`/api/feed/${postId}/read`, { method: "POST", credentials: "include" }).catch(() => {});
  };

  const toggleReaction = (postId: string, emoji: string) => {
    fetch(`/api/feed/${postId}/reaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ emoji }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.reactions) {
          setItems((prev) =>
            prev.map((p) => (p.id === postId ? { ...p, reactions: json.data.reactions } : p))
          );
        }
      })
      .catch(() => {});
  };

  const filterChannels = (list: Channel[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((c) => c.name.toLowerCase().includes(q));
  };

  const filterRooms = (list: Room[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((r) => r.name.toLowerCase().includes(q) || r.members.some((m) => m.name.toLowerCase().includes(q)));
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-50">
      {/* 좌측 사이드바 */}
      <aside className="w-64 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col">
        <div className="p-2 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="대화방 검색 Ctrl+J"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {/* 토픽 */}
          <div className="px-2">
            <button
              type="button"
              onClick={() => setTopicOpen((o) => ({ ...o, topic: !o.topic }))}
              className="w-full flex items-center justify-between py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg px-2"
            >
              <span>토픽 {channelGroups.reduce((n, g) => n + g.list.length, 0)}</span>
              {topicOpen.topic ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {topicOpen.topic !== false && (
              <div className="pl-2 space-y-0.5">
                {channelGroups.map((group) => {
                  const list = filterChannels(group.list);
                  if (list.length === 0) return null;
                  return (
                    <div key={group.groupName} className="mb-2">
                      <div className="text-xs font-medium text-slate-500 px-2 py-1">{group.groupName} {list.length}</div>
                      {list.map((ch) => (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => {
                            setSelectedChannelId(ch.id);
                            setSelectedRoomId(null);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate ${
                            selectedChannelId === ch.id && !selectedRoomId
                              ? "bg-blue-50 text-blue-700 font-medium"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {ch.name}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 채팅 (그룹만) */}
          <div className="px-2 mt-2 border-t border-slate-100 pt-2">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-slate-700">채팅 {rooms.length}</span>
              <button
                type="button"
                title="새 그룹 채팅"
                className="p-1 rounded hover:bg-slate-100 text-slate-500"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-0.5">
              {filterRooms(rooms).map((room) => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => {
                    setSelectedRoomId(room.id);
                    setSelectedChannelId(null);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left ${
                    selectedRoomId === room.id ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {room.members.length > 0 && room.members[0].avatarUrl ? (
                      <img src={room.members[0].avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                  <span className="truncate flex-1">{room.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 앱 */}
          <div className="px-2 mt-2 border-t border-slate-100 pt-2">
            <button
              type="button"
              className="w-full flex items-center gap-2 py-2 text-sm text-slate-500 hover:text-slate-700"
            >
              <ChevronRight className="w-4 h-4" />
              앱
            </button>
            <div className="flex gap-1 px-2">
              <button type="button" className="p-2 rounded hover:bg-slate-100" title="메뉴">
                <Menu className="w-4 h-4 text-slate-500" />
              </button>
              <button type="button" className="p-2 rounded hover:bg-slate-100" title="앱">
                <LayoutGrid className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* 메인 영역 */}
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        {/* 헤더 */}
        <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-slate-800 truncate">{headerTitle}</h1>
            {headerMemberCount != null && (
              <span className="flex items-center gap-1 text-sm text-slate-500">
                <Users className="w-4 h-4" />
                {headerMemberCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" title="검색">
              <Search className="w-4 h-4" />
            </button>
            <button type="button" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" title="알림">
              <MessageCircle className="w-4 h-4" />
            </button>
            <button type="button" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" title="더보기">
              <span className="text-slate-500 font-bold">⋯</span>
            </button>
          </div>
        </header>

        {/* 타임라인 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!selectedChannelId && !selectedRoomId ? (
            <div className="py-12 text-center text-slate-500 text-sm">왼쪽에서 채널 또는 대화방을 선택하세요.</div>
          ) : loading && items.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm">로딩 중...</div>
          ) : error ? (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">아직 게시글이 없습니다.</div>
          ) : (
            items.map((post) => (
              <article key={post.id} className="group">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-slate-200 overflow-hidden">
                    {post.userAvatarUrl ? (
                      <img src={post.userAvatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm font-medium">
                        {post.userName.slice(0, 1)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-slate-800 text-sm">{post.userName}</span>
                      <span className="text-xs text-slate-500">
                        {format(new Date(post.createdAt), "a h:mm", { locale: ko })}
                      </span>
                    </div>
                    <p className="text-slate-700 text-sm whitespace-pre-wrap break-words">{post.content}</p>
                    {post.attachments && post.attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {post.attachments.map((att, i) =>
                          att.type === "image" ? (
                            <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="block">
                              <img
                                src={att.url}
                                alt={att.fileName || "첨부"}
                                className="max-w-full max-h-64 object-contain rounded-lg border border-slate-200"
                              />
                            </a>
                          ) : (
                            <div key={i} className="rounded-lg border border-slate-200 overflow-hidden bg-slate-100">
                              <video
                                src={att.url}
                                controls
                                className="max-w-full max-h-64"
                                preload="metadata"
                              />
                              {att.fileName && (
                                <p className="text-xs text-slate-500 px-2 py-1 truncate">{att.fileName}</p>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {post.readCount > 0 && (
                        <span className="text-xs text-slate-500">읽음 {post.readCount}</span>
                      )}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {REACTION_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => toggleReaction(post.id, emoji)}
                            className="p-1 rounded hover:bg-slate-100 text-sm"
                            title={emoji}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                      {Object.entries(post.reactions || {}).map(([emoji, count]) =>
                        count > 0 ? (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => toggleReaction(post.id, emoji)}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 text-xs"
                          >
                            {emoji} {count}
                          </button>
                        ) : null
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
          {nextCursor && (selectedChannelId || selectedRoomId) && (
            <div className="text-center py-4">
              <button
                type="button"
                onClick={() => fetchFeed(nextCursor)}
                className="text-sm text-blue-600 hover:underline font-medium"
              >
                더 보기
              </button>
            </div>
          )}
        </div>

        {/* 메시지 입력 */}
        {(selectedChannelId || selectedRoomId) && (
          <div className="flex-shrink-0 border-t border-slate-200 p-4 bg-slate-50">
            <form onSubmit={handleSubmit}>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onBlur={() => items.forEach((p) => markRead(p.id))}
                placeholder="메시지를 입력하세요....."
                rows={3}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
              />
              {files.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {files.map((f, i) => (
                    <div key={i} className="relative inline-block">
                      {f.type.startsWith("image/") ? (
                        <img
                          src={URL.createObjectURL(f)}
                          alt=""
                          className="w-16 h-16 object-cover rounded border border-slate-200"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded border border-slate-200 bg-slate-100 flex items-center justify-center">
                          <Video className="w-6 h-6 text-slate-500" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                <div className="flex items-center gap-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-lg hover:bg-slate-200 text-slate-600"
                    title="멘션"
                  >
                    <AtSign className="w-4 h-4" />
                  </button>
                  <button type="button" className="p-2 rounded-lg hover:bg-slate-200 text-slate-600" title="서식">
                    <Bold className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-lg hover:bg-slate-200 text-slate-600"
                    title="파일 첨부"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-lg hover:bg-slate-200 text-slate-600"
                    title="이미지/영상"
                  >
                    <ImagePlus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Shift + Enter 로 줄바꿈</span>
                  <button
                    type="submit"
                    disabled={(!content.trim() && files.length === 0) || posting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-medium transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    게시
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
