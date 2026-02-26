"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Search,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ImagePlus,
  Send,
  Video,
  Users,
  AtSign,
  Paperclip,
  Bold,
  MessageCircle,
  Plus,
  LayoutGrid,
  Menu,
  X,
  UserPlus,
} from "lucide-react";
import FeedChatView from "@/components/FeedChatView";

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

type ChatUser = { id: string; name: string; avatarUrl: string | null; username?: string };

const REACTION_EMOJIS = ["👍", "✓", "💬", "❤️"];
const CHANNEL_GROUPS = ["메인", "기타"];

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
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const [headerTitle, setHeaderTitle] = useState("소통방");
  const [headerMemberCount, setHeaderMemberCount] = useState<number | null>(null);
  const [searchPanelOpen, setSearchPanelOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [appSectionOpen, setAppSectionOpen] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [modalAddChannel, setModalAddChannel] = useState(false);
  const [modalGroupRoom, setModalGroupRoom] = useState(false);
  const [modalDM, setModalDM] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelGroup, setNewChannelGroup] = useState("메인");
  const [newRoomName, setNewRoomName] = useState("");
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const [myId, setMyId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"topic" | "chat">("topic");
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [fabMenuOpen, setFabMenuOpen] = useState(false);

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
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => res.json())
      .then((json) => { if (json.success && json.data?.id) setMyId(json.data.id); })
      .catch(() => {});
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

  const fetchFeed = (cursor?: string, q?: string) => {
    const params = new URLSearchParams({ limit: "20" });
    if (selectedChannelId) params.set("channelId", selectedChannelId);
    if (selectedRoomId) params.set("roomId", selectedRoomId);
    if (cursor) params.set("cursor", cursor);
    if (q?.trim()) params.set("q", q.trim());
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
      fetchFeed(undefined, searchPanelOpen ? searchInput : undefined);
    } else {
      setItems([]);
      setNextCursor(null);
      setLoading(false);
    }
  }, [selectedChannelId, selectedRoomId]);

  const runSearch = () => {
    if (selectedChannelId || selectedRoomId) fetchFeed(undefined, searchInput);
  };

  const loadChatUsers = () => {
    fetch("/api/feed/chat-users", { credentials: "include" })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.users) setChatUsers(json.data.users);
      })
      .catch(() => {});
  };

  const handleAddChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    setModalLoading(true);
    setModalError("");
    fetch("/api/feed/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: newChannelName.trim(), groupName: newChannelGroup }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.id) {
          loadChannels();
          setSelectedChannelId(json.data.id);
          setSelectedRoomId(null);
          setModalAddChannel(false);
          setNewChannelName("");
        } else {
          setModalError(json.error?.message || "채널 생성에 실패했습니다.");
        }
      })
      .catch(() => setModalError("네트워크 오류"))
      .finally(() => setModalLoading(false));
  };

  const handleAddGroupRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    const userIds = selectedUserIds;
    if (userIds.length === 0) {
      setModalError("참여할 멤버를 1명 이상 선택해주세요.");
      return;
    }
    setModalLoading(true);
    setModalError("");
    fetch("/api/feed/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: newRoomName.trim(), userIds }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.id) {
          loadRooms();
          setSelectedRoomId(json.data.id);
          setSelectedChannelId(null);
          setModalGroupRoom(false);
          setNewRoomName("");
          setSelectedUserIds([]);
        } else {
          setModalError(json.error?.message || "방 생성에 실패했습니다.");
        }
      })
      .catch(() => setModalError("네트워크 오류"))
      .finally(() => setModalLoading(false));
  };

  const handleStartDM = (otherUserId: string) => {
    setModalLoading(true);
    setModalError("");
    fetch("/api/feed/rooms/direct", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ otherUserId }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.id) {
          loadRooms();
          setSelectedRoomId(json.data.id);
          setSelectedChannelId(null);
          setModalDM(false);
        } else {
          setModalError(json.error?.message || "1:1 채팅을 시작할 수 없습니다.");
        }
      })
      .catch(() => setModalError("네트워크 오류"))
      .finally(() => setModalLoading(false));
  };

  const toggleUserId = (id: string) => {
    setSelectedUserIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const insertMention = (name: string) => {
    const text = `@${name} `;
    if (contentRef.current) {
      const start = contentRef.current.selectionStart ?? 0;
      const end = contentRef.current.selectionEnd ?? 0;
      const before = content.slice(0, start);
      const after = content.slice(end);
      setContent(before + text + after);
      setMentionOpen(false);
      setTimeout(() => contentRef.current?.focus(), 0);
    } else {
      setContent((c) => c + text);
      setMentionOpen(false);
    }
  };

  const mentionList: ChatUser[] = selectedRoomId && currentRoom ? currentRoom.members.map((m) => ({ id: m.id, name: m.name, avatarUrl: m.avatarUrl })) : chatUsers;
  const openMention = () => {
    setMentionOpen(true);
    if (selectedChannelId && !chatUsers.length) loadChatUsers();
  };

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

  const selectChannel = (chId: string) => {
    setSelectedChannelId(chId);
    setSelectedRoomId(null);
    setMobileChatOpen(true);
  };
  const selectRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
    setSelectedChannelId(null);
    setMobileChatOpen(true);
  };

  const allChannels = channelGroups.flatMap((g) => g.list);
  const filteredChannelsForTab = filterChannels(allChannels);
  const filteredRoomsForTab = filterRooms(rooms);

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-50">
      {/* 좌측 사이드바: md 이상에서만 3분할로 표시, 모바일에서는 리스트만 */}
      <aside
        className={`
          flex flex-col border-r border-slate-200 bg-white
          md:w-64 md:flex-shrink-0
          ${mobileChatOpen ? "hidden md:flex" : "flex w-full md:w-64"}
        `}
      >
        <div className="border-b border-slate-100 p-2 md:p-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={activeTab === "topic" ? "토픽 검색" : "채팅 검색"}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 모바일: 탭별 단일 리스트 (실시간 검색 반영) */}
        <div className="flex-1 overflow-y-auto py-2 min-h-0">
          <div className="block space-y-0.5 px-2 md:hidden">
            {activeTab === "topic" &&
              filteredChannelsForTab.map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => selectChannel(ch.id)}
                  className={`w-full truncate rounded-lg px-3 py-2.5 text-left text-sm ${
                    selectedChannelId === ch.id && !selectedRoomId
                      ? "bg-blue-50 font-medium text-blue-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {ch.name}
                </button>
              ))}
            {activeTab === "chat" &&
              filteredRoomsForTab.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => selectRoom(room.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm ${
                    selectedRoomId === room.id
                      ? "bg-blue-50 font-medium text-blue-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-slate-200">
                    {room.members.length > 0 && room.members[0].avatarUrl ? (
                      <img src={room.members[0].avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Users className="h-4 w-4 text-slate-500 m-2" />
                    )}
                  </div>
                  <span className="min-w-0 flex-1 truncate">
                    {room.memberCount === 2 && myId && room.members.find((m) => m.id !== myId)
                      ? room.members.find((m) => m.id !== myId)!.name
                      : room.name}
                  </span>
                </button>
              ))}
          </div>

          {/* 데스크톱: 토픽 섹션 (스크롤 영역) */}
          <div className="px-2 hidden md:block">
            <div className="flex w-full items-center justify-between px-2 py-2">
              <button
                type="button"
                onClick={() => setTopicOpen((o) => ({ ...o, topic: !o.topic }))}
                className="-mx-1 flex flex-1 items-center justify-between rounded-lg py-1 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <span>토픽 {channelGroups.reduce((n, g) => n + g.list.length, 0)}</span>
                {topicOpen.topic ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => { setModalAddChannel(true); setModalError(""); setNewChannelName(""); setNewChannelGroup("메인"); }}
                className="rounded p-1 text-slate-500 hover:bg-slate-100"
                title="채널 추가"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {topicOpen.topic !== false && (
              <div className="space-y-0.5 pl-2">
                {channelGroups.map((group) => {
                  const list = filterChannels(group.list);
                  if (list.length === 0) return null;
                  return (
                    <div key={group.groupName} className="mb-2">
                      <div className="px-2 py-1 text-xs font-medium text-slate-500">{group.groupName} {list.length}</div>
                      {list.map((ch) => (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => { setSelectedChannelId(ch.id); setSelectedRoomId(null); }}
                          className={`w-full truncate rounded-lg px-3 py-2 text-left text-sm ${
                            selectedChannelId === ch.id && !selectedRoomId ? "bg-blue-50 font-medium text-blue-700" : "text-slate-700 hover:bg-slate-50"
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

          {/* 데스크톱: 앱 (스크롤 영역) */}
          <div className="px-2 mt-2 border-t border-slate-100 pt-2 hidden md:block">
            <button
              type="button"
              onClick={() => setAppSectionOpen((o) => !o)}
              className="w-full flex items-center gap-2 py-2 text-sm text-slate-500 hover:text-slate-700"
            >
              {appSectionOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              앱
            </button>
            {appSectionOpen && (
              <div className="pl-2 py-2 flex flex-col gap-1">
                <div className="flex gap-1">
                  <button type="button" className="p-2 rounded hover:bg-slate-100" title="메뉴">
                    <Menu className="w-4 h-4 text-slate-500" />
                  </button>
                  <button type="button" className="p-2 rounded hover:bg-slate-100" title="앱">
                    <LayoutGrid className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
                <p className="text-xs text-slate-400">추가 예정</p>
              </div>
            )}
          </div>
        </div>

        {/* 데스크톱: 채팅 (하단 고정, 스크롤 없이 항상 보임) */}
        <div className="shrink-0 border-t border-slate-200 bg-white px-2 py-2 hidden md:block">
          <div className="flex items-center justify-between py-1">
            <span className="text-sm font-medium text-slate-700">채팅 {rooms.length}</span>
            <div className="flex items-center gap-0.5">
              <button type="button" onClick={() => { setModalDM(true); setModalError(""); loadChatUsers(); }} className="rounded p-1 text-slate-500 hover:bg-slate-100" title="1:1 채팅">
                <UserPlus className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => { setModalGroupRoom(true); setNewRoomName(""); setSelectedUserIds([]); setModalError(""); loadChatUsers(); }} className="rounded p-1 text-slate-500 hover:bg-slate-100" title="새 그룹 채팅">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="space-y-0.5 max-h-48 overflow-y-auto">
            {filterRooms(rooms).map((room) => (
              <button
                key={room.id}
                type="button"
                onClick={() => { setSelectedRoomId(room.id); setSelectedChannelId(null); }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                  selectedRoomId === room.id ? "bg-blue-50 font-medium text-blue-700" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-slate-200">
                  {room.members.length > 0 && room.members[0].avatarUrl ? (
                    <img src={room.members[0].avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Users className="h-4 w-4 text-slate-500" />
                  )}
                </div>
                <span className="min-w-0 flex-1 truncate">
                  {room.memberCount === 2 && myId && room.members.find((m) => m.id !== myId) ? room.members.find((m) => m.id !== myId)!.name : room.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 모바일 전용 하단 탭 [토픽 / 채팅] */}
        <nav className="flex shrink-0 border-t border-slate-200 bg-white md:hidden">
          <button
            type="button"
            onClick={() => setActiveTab("topic")}
            className={`flex-1 py-3 text-sm font-medium ${activeTab === "topic" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-500"}`}
          >
            토픽
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("chat")}
            className={`flex-1 py-3 text-sm font-medium ${activeTab === "chat" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-500"}`}
          >
            채팅
          </button>
        </nav>
      </aside>

      {/* 메인 영역: 모바일에서 채팅 열림 시 전체 화면 */}
      <main className={`flex flex-1 flex-col min-w-0 bg-white ${mobileChatOpen ? "fixed inset-0 z-30 md:relative md:z-0" : "hidden md:flex"}`}>
        <header className="flex shrink-0 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between px-3 py-2.5 md:px-4 md:py-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <button type="button" onClick={() => setMobileChatOpen(false)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden" aria-label="뒤로가기">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h1 className="min-w-0 truncate text-base font-semibold text-slate-800 md:text-lg">{headerTitle}</h1>
              {headerMemberCount != null && (
                <span className="flex shrink-0 items-center gap-1 text-sm text-slate-500">
                  <Users className="h-4 w-4" />
                  {headerMemberCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 relative">
              <button type="button" onClick={() => setSearchPanelOpen((o) => { if (!o) setSearchInput(""); return !o; })} className={`p-2 rounded-lg ${searchPanelOpen ? "bg-blue-50 text-blue-600" : "hover:bg-slate-100 text-slate-500"}`} title="검색">
                <Search className="w-4 h-4" />
              </button>
              <Link href="/dashboard" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" title="알림">
                <MessageCircle className="w-4 h-4" />
              </Link>
              <div className="relative">
                <button type="button" onClick={() => setMoreOpen((o) => !o)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" title="더보기">
                  <span className="text-slate-500 font-bold">⋯</span>
                </button>
                {moreOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMoreOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 py-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 min-w-[140px]">
                      {selectedChannelId && currentChannel && (
                        <div className="px-3 py-2 text-sm text-slate-600 border-b border-slate-100">
                          <p className="font-medium">채널 정보</p>
                          <p className="text-slate-500">{currentChannel.name} · {currentChannel.slug}</p>
                        </div>
                      )}
                      {selectedRoomId && currentRoom && (
                        <div className="px-3 py-2 text-sm text-slate-600 border-b border-slate-100">
                          <p className="font-medium">대화방 멤버</p>
                          <p className="text-slate-500">{currentRoom.members.map((m) => m.name).join(", ")}</p>
                        </div>
                      )}
                      {!selectedChannelId && !selectedRoomId && (
                        <p className="px-3 py-2 text-sm text-slate-500">채널 또는 대화방을 선택하세요.</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          {searchPanelOpen && (
            <div className="px-4 pb-3 flex gap-2">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), runSearch())}
                placeholder="메시지 검색..."
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button type="button" onClick={runSearch} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm">검색</button>
              <button type="button" onClick={() => { setSearchPanelOpen(false); setSearchInput(""); if (selectedChannelId || selectedRoomId) fetchFeed(); }} className="px-3 py-2 rounded-lg border border-slate-200 text-sm">취소</button>
            </div>
          )}
        </header>

        {/* 타임라인 (말풍선 + 날짜 구분선) */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4">
          {searchPanelOpen && searchInput.trim() && (selectedChannelId || selectedRoomId) && (
            <p className="text-sm text-slate-500">검색 결과: &quot;{searchInput}&quot;</p>
          )}
          {!selectedChannelId && !selectedRoomId ? (
            <div className="py-12 text-center text-slate-500 text-sm">왼쪽에서 채널 또는 대화방을 선택하세요.</div>
          ) : loading && items.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm">로딩 중...</div>
          ) : error ? (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">아직 게시글이 없습니다.</div>
          ) : (
            <FeedChatView items={items} myId={myId} onReaction={toggleReaction} />
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

        {/* 메시지 입력 (잔디 스타일: 하단 고정, 흰 배경, + / 입력 / 보내기) */}
        {(selectedChannelId || selectedRoomId) && (
          <div className="flex shrink-0 flex-col border-t border-slate-200 bg-white p-2 md:p-3">
            {files.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <div key={i} className="relative">
                    {f.type.startsWith("image/") ? (
                      <img src={URL.createObjectURL(f)} alt="" className="h-16 w-16 rounded border border-slate-200 object-cover" />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded border border-slate-200 bg-slate-100">
                        <Video className="h-6 w-6 text-slate-500" />
                      </div>
                    )}
                    <button type="button" onClick={() => removeFile(i)} className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white hover:bg-red-600">×</button>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={handleFileChange} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="flex shrink-0 items-center justify-center rounded-lg p-2.5 text-slate-500 hover:bg-slate-100" title="파일 첨부">
                <Plus className="h-5 w-5" />
              </button>
              <div className="relative min-w-0 flex-1">
                <textarea
                  ref={contentRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onBlur={() => items.forEach((p) => markRead(p.id))}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    if (e.shiftKey) return; // Shift+Enter → 줄바꿈(기본 동작 유지)
                    e.preventDefault();
                    (e.target as HTMLTextAreaElement).form?.requestSubmit();
                  }}
                  placeholder="메시지를 입력하세요..."
                  rows={1}
                  className="max-h-32 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {mentionOpen && (
                  <>
                    <div className="absolute inset-0 z-10" onClick={() => setMentionOpen(false)} />
                    <div className="absolute bottom-full left-0 z-20 mb-1 max-h-40 min-w-[180px] overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                      {mentionList.map((u) => (
                        <button key={u.id} type="button" onClick={() => insertMention(u.name)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50">
                          {u.avatarUrl ? <img src={u.avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover" /> : <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs">{u.name.slice(0, 1)}</div>}
                          {u.name}
                        </button>
                      ))}
                      {mentionList.length === 0 && <p className="px-3 py-2 text-sm text-slate-500">멤버 없음</p>}
                    </div>
                  </>
                )}
              </div>
              <button
                type="submit"
                disabled={(!content.trim() && files.length === 0) || posting}
                className="flex shrink-0 items-center justify-center rounded-full bg-blue-600 p-2.5 text-white hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none"
                title="보내기"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
            <div className="mt-1 flex items-center gap-2 px-1">
              <button type="button" onClick={openMention} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="멘션">@</button>
              <span className="text-[10px] text-slate-400 md:text-xs">Shift+Enter 줄바꿈</span>
            </div>
          </div>
        )}
      </main>

      {/* 플로팅 액션 버튼 (우측 하단): 토픽 탭이면 새 토픽, 채팅 탭이면 1:1/그룹 선택 */}
      <div className={`fixed bottom-20 right-4 z-20 md:bottom-6 md:right-6 ${mobileChatOpen ? "hidden md:block" : "block"}`}>
        <div className="relative">
          <button
            type="button"
            onClick={() => (activeTab === "topic" ? (setModalAddChannel(true), setModalError(""), setNewChannelName(""), setNewChannelGroup("메인")) : setFabMenuOpen((o) => !o))}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 md:h-14 md:w-14"
            aria-label="추가"
          >
            <Plus className="h-6 w-6 md:h-7 md:w-7" />
          </button>
          {activeTab === "chat" && fabMenuOpen && (
            <>
              <div className="fixed inset-0 z-0" onClick={() => setFabMenuOpen(false)} />
              <div className="absolute bottom-full right-0 z-10 mb-2 w-40 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                <button type="button" onClick={() => { setFabMenuOpen(false); setModalDM(true); setModalError(""); loadChatUsers(); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50">
                  <UserPlus className="h-4 w-4" />
                  1:1 채팅
                </button>
                <button type="button" onClick={() => { setFabMenuOpen(false); setModalGroupRoom(true); setNewRoomName(""); setSelectedUserIds([]); setModalError(""); loadChatUsers(); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50">
                  <Users className="h-4 w-4" />
                  그룹 채팅
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 모달: 채널 추가 */}
      {modalAddChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => !modalLoading && setModalAddChannel(false)}>
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">채널 추가</h2>
              <button type="button" onClick={() => !modalLoading && setModalAddChannel(false)} className="p-1 rounded hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddChannel} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">채널 이름</label>
                <input value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="예: 업무 공유" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">그룹</label>
                <select value={newChannelGroup} onChange={(e) => setNewChannelGroup(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                  {CHANNEL_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              {modalError && <p className="text-sm text-red-600">{modalError}</p>}
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setModalAddChannel(false)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm">취소</button>
                <button type="submit" disabled={modalLoading || !newChannelName.trim()} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50">추가</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 모달: 새 그룹 채팅 */}
      {modalGroupRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => !modalLoading && setModalGroupRoom(false)}>
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">새 그룹 채팅</h2>
              <button type="button" onClick={() => !modalLoading && setModalGroupRoom(false)} className="p-1 rounded hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddGroupRoom} className="flex flex-col flex-1 min-h-0 space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">방 이름</label>
                <input value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="예: 프로젝트 A팀" required />
              </div>
              <div className="flex-1 min-h-0 flex flex-col">
                <label className="block text-sm font-medium text-slate-700 mb-1">멤버 선택</label>
                <div className="border border-slate-200 rounded-lg p-2 overflow-y-auto max-h-48 space-y-1">
                  {chatUsers.map((u) => (
                    <label key={u.id} className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" checked={selectedUserIds.includes(u.id)} onChange={() => toggleUserId(u.id)} className="rounded" />
                      {u.avatarUrl ? <img src={u.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" /> : <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs">{u.name.slice(0, 1)}</div>}
                      <span className="text-sm">{u.name}</span>
                    </label>
                  ))}
                  {chatUsers.length === 0 && <p className="text-sm text-slate-500 py-2">로딩 중이거나 선택 가능한 사용자가 없습니다.</p>}
                </div>
              </div>
              {modalError && <p className="text-sm text-red-600">{modalError}</p>}
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setModalGroupRoom(false)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm">취소</button>
                <button type="submit" disabled={modalLoading || !newRoomName.trim()} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50">만들기</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 모달: 1:1 채팅 */}
      {modalDM && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => !modalLoading && setModalDM(false)}>
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">1:1 채팅</h2>
              <button type="button" onClick={() => !modalLoading && setModalDM(false)} className="p-1 rounded hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-slate-600 mb-2">대화할 상대를 선택하세요.</p>
            <div className="overflow-y-auto flex-1 space-y-1">
              {chatUsers.map((u) => (
                <button key={u.id} type="button" onClick={() => handleStartDM(u.id)} disabled={modalLoading} className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 text-left disabled:opacity-50">
                  {u.avatarUrl ? <img src={u.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm">{u.name.slice(0, 1)}</div>}
                  <span className="text-sm font-medium">{u.name}</span>
                </button>
              ))}
              {chatUsers.length === 0 && <p className="text-sm text-slate-500 py-2">로딩 중이거나 선택 가능한 사용자가 없습니다.</p>}
            </div>
            {modalError && <p className="text-sm text-red-600 mt-2">{modalError}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
