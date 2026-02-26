import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession, isCEO } from "@/lib/auth";
import { success, errors } from "@/lib/api-response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const session = await requireSession();
    const { eventId } = await params;
    if (eventId.startsWith("ann-")) return errors.notFound();

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        team: { select: { id: true, name: true } },
      },
    });
    if (!event) return errors.notFound("일정을 찾을 수 없습니다.");

    if (!isCEO(session.role) && event.assigneeId !== session.sub) {
      return errors.forbidden();
    }

    return success({
      id: event.id,
      title: event.title,
      description: event.description,
      start: event.startAt,
      end: event.endAt,
      assigneeId: event.assigneeId,
      assigneeName: event.assignee.name,
      assigneeAvatarUrl: event.assignee.avatarUrl ?? null,
      teamId: event.teamId,
      teamName: event.team.name,
      status: event.status,
      priority: event.priority,
      recurrence: event.recurrence,
      remindAt: event.remindAt,
      category: event.category ?? null,
      color: event.color ?? null,
      isAnnouncement: false,
      createdBy: event.createdBy,
      createdAt: event.createdAt,
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const session = await requireSession();
    const { eventId } = await params;
    if (eventId.startsWith("ann-")) return errors.notFound();

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return errors.notFound("일정을 찾을 수 없습니다.");
    if (!isCEO(session.role) && event.assigneeId !== session.sub) return errors.forbidden();

    const body = await req.json();
    const { title, description, start, end, assigneeId, teamId, status, priority, recurrence, remindMinutesBefore, category, color } = body;

    const updateData: {
      title?: string;
      description?: string;
      startAt?: Date;
      endAt?: Date;
      assigneeId?: string;
      teamId?: string;
      status?: string;
      priority?: string;
      recurrence?: unknown;
      remindAt?: Date | null;
      category?: string | null;
      color?: string | null;
    } = {};

    if (title !== undefined) updateData.title = String(title).trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (start) updateData.startAt = new Date(start);
    if (end) updateData.endAt = new Date(end);
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (recurrence !== undefined) updateData.recurrence = recurrence;
    if (remindMinutesBefore !== undefined) {
      const startAt = updateData.startAt ?? event.startAt;
      updateData.remindAt = remindMinutesBefore != null
        ? new Date(new Date(startAt).getTime() - remindMinutesBefore * 60 * 1000)
        : null;
    }
    if (isCEO(session.role)) {
      if (assigneeId) updateData.assigneeId = assigneeId;
      if (teamId) updateData.teamId = teamId;
    }
    if (category !== undefined) updateData.category = category && ["전체 공지", "팀 일정", "연차", "기타"].includes(category) ? category : null;
    if (color !== undefined) updateData.color = color && ["blue", "green", "purple", "orange", "pink", "red", "slate"].includes(color) ? color : null;

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: updateData as Prisma.EventUncheckedUpdateInput,
      include: {
        assignee: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
      },
    });

    return success({
      id: updated.id,
      title: updated.title,
      start: updated.startAt,
      end: updated.endAt,
      status: updated.status,
      updatedAt: updated.updatedAt,
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const session = await requireSession();
    const { eventId } = await params;
    if (eventId.startsWith("ann-")) return errors.notFound();

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return errors.notFound("일정을 찾을 수 없습니다.");
    if (!isCEO(session.role) && event.assigneeId !== session.sub) return errors.forbidden();

    await prisma.event.delete({ where: { id: eventId } });
    return success({ message: "일정이 삭제되었습니다." });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}
