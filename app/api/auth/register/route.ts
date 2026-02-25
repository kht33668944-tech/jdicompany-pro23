import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { created, errors } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password, name, email } = body;

    if (!username?.trim() || !password) {
      return errors.badRequest("아이디와 비밀번호를 입력해주세요.");
    }
    if (!name?.trim()) return errors.badRequest("이름을 입력해주세요.");
    if (password.length < 6) return errors.badRequest("비밀번호는 6자 이상이어야 합니다.");

    const existing = await prisma.user.findUnique({ where: { username: username.trim() } });
    if (existing) return errors.duplicate("이미 사용 중인 아이디입니다.");

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        username: username.trim(),
        passwordHash,
        name: name.trim(),
        email: email?.trim() || null,
        role: "TEAM_MEMBER",
        status: "PENDING",
      },
      include: { team: true },
    });

    return created({
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      status: user.status,
      message: "가입이 완료되었습니다. 대표 승인 후 로그인할 수 있습니다.",
    });
  } catch (e) {
    console.error(e);
    return errors.server();
  }
}
