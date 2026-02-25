import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isCEO } from "@/lib/auth";
import { success, created, errors } from "@/lib/api-response";
import { startOfDay } from "date-fns";

/** GET: 내 연차 목록 또는 CEO일 때 status=pending 목록 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: { userId?: string; status?: string } = {};
    if (isCEO(session.role) && status === "pending") {
      where.status = "pending";
    } else {
      where.userId = session.sub;
      if (status && ["pending", "approved", "rejected"].includes(status)) {
        where.status = status;
      }
    }

    const list = await prisma.leaveRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true } } },
    });

    const data = list.map((l) => ({
      id: l.id,
      userId: l.userId,
      userName: l.user.name,
      startDate: l.startDate,
      endDate: l.endDate,
      reason: l.reason,
      status: l.status,
      approvedBy: l.approvedBy,
      createdAt: l.createdAt,
    }));

    return success(data);
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}

/** POST: 연차 신청 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const { startDate, endDate, reason } = body;

    if (!startDate || !endDate) return errors.badRequest("시작일·종료일을 입력해주세요.");
    const start = startOfDay(new Date(startDate));
    const end = startOfDay(new Date(endDate));
    if (end < start) return errors.badRequest("종료일이 시작일보다 앞설 수 없습니다.");

    const leave = await prisma.leaveRequest.create({
      data: {
        userId: session.sub,
        startDate: start,
        endDate: end,
        reason: (reason as string)?.trim() || null,
        status: "pending",
      },
      include: { user: { select: { name: true } } },
    });

    return created({
      id: leave.id,
      startDate: leave.startDate,
      endDate: leave.endDate,
      reason: leave.reason,
      status: leave.status,
      createdAt: leave.createdAt,
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}
