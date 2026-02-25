import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isCEO } from "@/lib/auth";
import { createNotification } from "@/lib/notify";
import { success, errors } from "@/lib/api-response";

/** PATCH: 연차 승인/반려 (CEO) 또는 신청 취소 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { user: { select: { name: true } } },
    });
    if (!leave) return errors.notFound("연차 신청을 찾을 수 없습니다.");

    if (isCEO(session.role)) {
      if (status !== "approved" && status !== "rejected") {
        return errors.badRequest("status는 approved 또는 rejected여야 합니다.");
      }
      await prisma.leaveRequest.update({
        where: { id },
        data: { status, approvedBy: session.sub },
      });
      if (status === "approved") {
        await createNotification(prisma, {
          userId: leave.userId,
          type: "leave_approved",
          title: "연차가 승인되었습니다.",
          link: "/me",
        });
      }
      return success({ id, status });
    }

    if (leave.userId !== session.sub) return errors.forbidden();
    if (leave.status !== "pending") return errors.badRequest("대기중인 신청만 취소할 수 있습니다.");
    if (status !== "cancelled") return errors.badRequest("본인은 취소만 가능합니다.");
    await prisma.leaveRequest.update({
      where: { id },
      data: { status: "cancelled" },
    });
    return success({ id, status: "cancelled" });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}
