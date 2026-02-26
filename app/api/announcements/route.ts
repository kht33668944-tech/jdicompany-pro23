import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireSession, isCEO, isTeamLeader } from "@/lib/auth";
import { success, created, errors } from "@/lib/api-response";

const ANNOUNCEMENT_MAX_BYTES = 10 * 1024 * 1024; // 10MB per file
const UPLOAD_DIR =
  process.env.UPLOAD_ANNOUNCEMENT_PATH || path.join(process.cwd(), "public", "uploads", "announcements");

type AnnouncementAttachment = {
  url: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
};

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    // 조회: 로그인(승인) 사용자 전원 허용. 작성/수정/삭제는 CEO만.

    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const type = searchParams.get("type");
    const teamId = searchParams.get("teamId");
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10)), 100) : undefined;

    const where: { type?: string; targetTeamId?: string; eventDate?: { gte?: Date; lte?: Date } } = {};
    if (type) where.type = type;
    if (teamId) where.targetTeamId = teamId;
    if (start && end) {
      where.eventDate = { gte: new Date(start), lte: new Date(end) };
    }

    const list = await prisma.announcement.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { creator: { select: { id: true, name: true } } },
    });

    const data = list.map((a) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      content: a.content,
      targetType: a.targetType,
      targetTeamId: a.targetTeamId,
      eventDate: a.eventDate,
      attachments: (a.attachments as AnnouncementAttachment[] | null) ?? [],
      createdBy: a.createdBy,
      creatorName: a.creator?.name ?? null,
      createdAt: a.createdAt,
    }));

    return success(data);
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!isCEO(session.role) && !isTeamLeader(session.role)) return errors.forbidden();

    const contentType = req.headers.get("content-type") || "";
    let type: string | null = null;
    let title: string | null = null;
    let content: string | null = null;
    let targetType: string | null = null;
    let targetTeamId: string | null = null;
    let eventDate: string | null = null;
    let attachments: AnnouncementAttachment[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      type = (formData.get("type") as string | null) ?? null;
      title = (formData.get("title") as string | null) ?? null;
      content = (formData.get("content") as string | null) ?? null;
      targetType = (formData.get("targetType") as string | null) ?? null;
      targetTeamId = (formData.get("targetTeamId") as string | null) ?? null;
      eventDate = (formData.get("eventDate") as string | null) ?? null;

      const files = formData.getAll("files").filter((f): f is File => f instanceof File);
      if (files.length) {
        await mkdir(UPLOAD_DIR, { recursive: true });
        for (const file of files) {
          if (file.size > ANNOUNCEMENT_MAX_BYTES) continue;
          const safeName = file.name || "attachment";
          const extFromName = safeName.includes(".") ? safeName.slice(safeName.lastIndexOf(".")) : "";
          const baseName = randomUUID() + extFromName;
          const filePath = path.join(UPLOAD_DIR, baseName);
          await writeFile(filePath, Buffer.from(await file.arrayBuffer()));
          const url = "/uploads/announcements/" + baseName;
          attachments.push({
            url,
            fileName: safeName,
            mimeType: file.type || undefined,
            size: file.size || undefined,
          });
        }
      }
    } else {
      const body = await req.json();
      type = body.type ?? null;
      title = body.title ?? null;
      content = body.content ?? null;
      targetType = body.targetType ?? null;
      targetTeamId = body.targetTeamId ?? null;
      eventDate = body.eventDate ?? null;
      if (Array.isArray(body.attachments)) attachments = body.attachments as AnnouncementAttachment[];
    }

    if (!type || !title?.trim()) return errors.badRequest("구분과 제목을 입력해주세요.");

    const announcement = await prisma.announcement.create({
      data: {
        type: type === "company_event" ? "company_event" : "notice",
        title: title.trim(),
        content: content?.trim() || null,
        targetType: targetType === "team" ? "team" : "all",
        targetTeamId: targetType === "team" ? targetTeamId || null : null,
        eventDate: eventDate ? new Date(eventDate) : null,
        attachments: attachments.length ? (attachments as unknown as object) : null,
        createdBy: session.sub,
      },
    });

    return created({
      id: announcement.id,
      type: announcement.type,
      title: announcement.title,
      targetType: announcement.targetType,
      createdAt: announcement.createdAt,
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}
