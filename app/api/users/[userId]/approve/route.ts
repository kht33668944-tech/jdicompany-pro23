import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isCEO } from "@/lib/auth";
import { success, errors } from "@/lib/api-response";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await requireSession();
    if (!isCEO(session.role)) return errors.forbidden();

    const { userId } = await params;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return errors.notFound("사용자를 찾을 수 없습니다.");
    if (user.status === "APPROVED") return errors.badRequest("이미 승인된 계정입니다.");

    await prisma.user.update({
      where: { id: userId },
      data: { status: "APPROVED" },
    });

    return success({
      message: "승인되었습니다.",
      userId,
      status: "APPROVED",
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}
