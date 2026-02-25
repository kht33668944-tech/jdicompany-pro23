import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isCEO } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { success, errors } from "@/lib/api-response";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await requireSession();
    if (!isCEO(session.role)) return errors.forbidden();

    const { userId } = await params;
    const body = await req.json();
    const newPassword = body.newPassword;
    if (!newPassword || newPassword.length < 6) {
      return errors.badRequest("새 비밀번호는 6자 이상이어야 합니다.");
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return errors.notFound("사용자를 찾을 수 없습니다.");

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    return success({
      message: "비밀번호가 초기화되었습니다.",
      temporaryPassword: newPassword,
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}
