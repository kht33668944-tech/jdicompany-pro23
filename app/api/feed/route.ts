import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { createNotification } from "@/lib/notify";
import { success, created, errors } from "@/lib/api-response";

const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const VIDEO_MAX_BYTES = 50 * 1024 * 1024;
const UPLOAD_DIR = process.env.UPLOAD_FEED_PATH || path.join(process.cwd(), "public", "uploads", "feed");

type AttachmentItem = { type: "image" | "video"; url: string; fileName?: string };

async function requireApprovedUser() {
  const session = await requireSession();
  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { status: true },
  });
  if (!me || me.status !== "APPROVED") throw new Error("FORBIDDEN");
  return session;
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireApprovedUser();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "20", 10)), 100);
    const cursor = searchParams.get("cursor") || undefined;
    const channelId = searchParams.get("channelId") || undefined;
    const roomId = searchParams.get("roomId") || undefined;
    const q = searchParams.get("q")?.trim();

    type WhereClause = {
      channelId?: string | null;
      roomId?: string | null;
      OR?: { channelId: string | null }[];
      content?: { contains: string; mode: "insensitive" };
    };
    let where: WhereClause = {};
    if (roomId) {
      const member = await prisma.feedRoomMember.findUnique({
        where: { roomId_userId: { roomId, userId: session.sub } },
      });
      if (!member) return errors.forbidden("이 대화방에 접근할 수 없습니다.");
      where.roomId = roomId;
    } else if (channelId) {
      where.channelId = channelId;
    } else {
      const defaultChannel = await prisma.feedChannel.findFirst({
        orderBy: { sortOrder: "asc" },
      });
      if (defaultChannel) {
        where = {
          roomId: null,
          OR: [{ channelId: defaultChannel.id }, { channelId: null }],
        } as { channelId?: string | null; roomId?: string | null; OR?: { channelId: string | null }[] };
      } else {
        where.roomId = null;
        where.channelId = null;
      }
    }
    if (q) {
      where.content = { contains: q, mode: "insensitive" };
    }

    const list = await prisma.feedPost.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        reactions: true,
        reads: true,
      },
    });

    const hasMore = list.length > limit;
    const items = hasMore ? list.slice(0, limit) : list;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    const reactionCounts = (post: (typeof items)[0]) => {
      const map = new Map<string, number>();
      for (const r of post.reactions) {
        map.set(r.emoji, (map.get(r.emoji) || 0) + 1);
      }
      return Object.fromEntries(map);
    };

    const data = items.map((p) => ({
      id: p.id,
      userId: p.userId,
      userName: p.user.name,
      userAvatarUrl: p.user.avatarUrl ?? null,
      content: p.content,
      attachments: (p.attachments as { type: string; url: string; fileName?: string }[] | null) ?? [],
      reactions: reactionCounts(p),
      readCount: p.reads.length,
      createdAt: p.createdAt,
    }));

    return success({ data, nextCursor: nextCursor as string | null });
  } catch (e) {
    const err = e as Error;
    if (err.message === "UNAUTHORIZED") return errors.unauthorized();
    if (err.message === "FORBIDDEN") return errors.forbidden();
    return errors.server();
  }
}

function getExtension(mime: string): string {
  if (mime.startsWith("image/")) {
    if (mime.includes("png")) return ".png";
    if (mime.includes("gif")) return ".gif";
    if (mime.includes("webp")) return ".webp";
    return ".jpg";
  }
  if (mime.startsWith("video/")) {
    if (mime.includes("webm")) return ".webm";
    if (mime.includes("mp4")) return ".mp4";
    return ".mp4";
  }
  return "";
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireApprovedUser();
    let content = "";
    let attachments: AttachmentItem[] = [];
    let channelId: string | null = null;
    let roomId: string | null = null;

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const contentField = formData.get("content");
      content = (typeof contentField === "string" ? contentField : contentField?.toString() || "").trim();
      const ch = formData.get("channelId");
      const rm = formData.get("roomId");
      if (typeof ch === "string" && ch) channelId = ch;
      if (typeof rm === "string" && rm) roomId = rm;
      const files = formData.getAll("files").filter((f): f is File => f instanceof File);
      if (files.length) {
        await mkdir(UPLOAD_DIR, { recursive: true });
        for (const file of files) {
          const mime = file.type || "";
          const isImage = mime.startsWith("image/");
          const isVideo = mime.startsWith("video/");
          if (!isImage && !isVideo) continue;
          const maxBytes = isImage ? IMAGE_MAX_BYTES : VIDEO_MAX_BYTES;
          if (file.size > maxBytes) continue;
          const ext = getExtension(mime) || (isImage ? ".jpg" : ".mp4");
          const baseName = randomUUID() + ext;
          const filePath = path.join(UPLOAD_DIR, baseName);
          const buf = Buffer.from(await file.arrayBuffer());
          await writeFile(filePath, buf);
          const url = "/uploads/feed/" + baseName;
          attachments.push({
            type: isImage ? "image" : "video",
            url,
            fileName: file.name || undefined,
          });
        }
      }
    } else {
      const body = await req.json();
      content = typeof body.content === "string" ? body.content.trim() : "";
      if (typeof body.channelId === "string" && body.channelId) channelId = body.channelId;
      if (typeof body.roomId === "string" && body.roomId) roomId = body.roomId;
      if (Array.isArray(body.attachments)) attachments = body.attachments as AttachmentItem[];
    }

    if (!content && attachments.length === 0) return errors.badRequest("내용을 입력해주세요.");
    if (!channelId && !roomId) return errors.badRequest("채널 또는 대화방을 선택해주세요.");

    if (roomId) {
      const member = await prisma.feedRoomMember.findUnique({
        where: { roomId_userId: { roomId, userId: session.sub } },
      });
      if (!member) return errors.forbidden("이 대화방에 게시할 수 없습니다.");
    } else if (channelId) {
      const ch = await prisma.feedChannel.findUnique({ where: { id: channelId } });
      if (!ch) return errors.notFound("채널을 찾을 수 없습니다.");
    }

    const post = await prisma.feedPost.create({
      data: {
        userId: session.sub,
        channelId: channelId || undefined,
        roomId: roomId || undefined,
        content: content || "(첨부만)",
        attachments: attachments.length ? (attachments as unknown as object) : undefined,
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    if (roomId) {
      const members = await prisma.feedRoomMember.findMany({
        where: { roomId },
        select: { userId: true },
      });
      // #region agent log
      fetch('http://127.0.0.1:7707/ingest/e44db668-df21-4b1a-b1d8-a6c0db0aa402',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'dd7562'},body:JSON.stringify({sessionId:'dd7562',location:'feed/route.ts:roomNotify',message:'feed room members',data:{roomId,senderId:session.sub,memberUserIds:members.map(m=>m.userId),memberCount:members.length},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const senderName = post.user.name;
      const link = `/feed?roomId=${roomId}`;
      const title = `${senderName}님이 메시지를 보냈습니다`;
      for (const m of members) {
        if (m.userId === session.sub) continue;
        await createNotification(prisma, {
          userId: m.userId,
          type: "feed_message",
          title,
          link,
        });
      }
    }

    return created({
      id: post.id,
      userId: post.userId,
      userName: post.user.name,
      userAvatarUrl: post.user.avatarUrl ?? null,
      content: post.content,
      attachments: (post.attachments as unknown as AttachmentItem[]) ?? [],
      reactions: {},
      readCount: 0,
      createdAt: post.createdAt,
    });
  } catch (e) {
    const err = e as Error;
    if (err.message === "UNAUTHORIZED") return errors.unauthorized();
    if (err.message === "FORBIDDEN") return errors.forbidden();
    return errors.server();
  }
}
