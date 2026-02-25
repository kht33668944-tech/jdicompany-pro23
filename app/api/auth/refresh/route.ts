import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { signAccessToken, verifyRefreshToken, getExpiresInSeconds } from "@/lib/auth";
import { success, errors } from "@/lib/api-response";

const ACCESS_EXP = process.env.JWT_ACCESS_EXPIRES_IN || "1h";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refreshToken")?.value;
    if (!refreshToken) return errors.unauthorized();

    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });
    if (!stored || stored.expiresAt < new Date()) {
      if (stored) await prisma.refreshToken.delete({ where: { id: stored.id } });
      return errors.unauthorized("토큰이 만료되었습니다.");
    }

    const payload = await verifyRefreshToken(refreshToken);
    if (!payload || payload.sub !== stored.userId) return errors.unauthorized();

    const user = stored.user;
    if (!user.isActive) return errors.unauthorized();

    const accessToken = await signAccessToken({
      sub: user.id,
      username: user.username,
      role: user.role,
    });

    cookieStore.set("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: getExpiresInSeconds(ACCESS_EXP),
      path: "/",
    });

    return success({
      token: accessToken,
      expiresIn: getExpiresInSeconds(ACCESS_EXP),
    });
  } catch (e) {
    console.error(e);
    return errors.server();
  }
}
