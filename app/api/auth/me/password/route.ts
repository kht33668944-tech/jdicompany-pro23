import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { success, errors } from "@/lib/api-response";

export async function PUT(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const { currentPassword, newPassword } = body;
    if (!currentPassword || !newPassword) {
      return errors.badRequest("현재 비밀번호와 새 비밀번호를 입력해주세요.");
    }
    if (newPassword.length < 6) {
      return errors.badRequest("새 비밀번호는 6자 이상이어야 합니다.");
    }

    const user = await prisma.user.findUnique({ where: { id: session.sub } });
    if (!user) return errors.unauthorized();

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) return errors.badRequest("현재 비밀번호가 일치하지 않습니다.");

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: session.sub },
      data: { passwordHash },
    });

    return success({ message: "비밀번호가 변경되었습니다." });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}
