import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { signAccessToken, signRefreshToken, getExpiresInSeconds } from "@/lib/auth";
import { success, errors } from "@/lib/api-response";
import { cookies } from "next/headers";

const ACCESS_EXP = process.env.JWT_ACCESS_EXPIRES_IN || "1h";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;
    if (!username || !password) {
      return errors.badRequest("아이디와 비밀번호를 입력해주세요.");
    }

    const user = await prisma.user.findUnique({
      where: { username: username.trim() },
      include: { team: true },
    });
    if (!user || !user.isActive) {
      return errors.unauthorized("아이디 또는 비밀번호가 올바르지 않습니다.");
    }
    if (user.status !== "APPROVED") {
      return errors.unauthorized("승인 대기 중인 계정입니다. 대표 승인 후 로그인할 수 있습니다.");
    }

    let valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      const isBcryptHash = /^\$2[ab]\$/.test(user.passwordHash);
      if (isBcryptHash) {
        return errors.unauthorized("아이디 또는 비밀번호가 올바르지 않습니다.");
      }
      valid = user.passwordHash === password;
      if (!valid) {
        return errors.unauthorized("아이디 또는 비밀번호가 올바르지 않습니다.");
      }
      const newHash = await hashPassword(password);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash },
      });
    }

    const accessToken = await signAccessToken({
      sub: user.id,
      username: user.username,
      role: user.role,
    });
    const refreshToken = await signRefreshToken(user.id);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const cookieStore = await cookies();
    cookieStore.set("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: getExpiresInSeconds(ACCESS_EXP),
      path: "/",
    });
    cookieStore.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return success({
      token: accessToken,
      refreshToken,
      expiresIn: getExpiresInSeconds(ACCESS_EXP),
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        teamId: user.teamId,
        teamName: user.team?.name ?? null,
        role: user.role,
      },
    });
  } catch (e) {
    console.error(e);
    return errors.server();
  }
}
