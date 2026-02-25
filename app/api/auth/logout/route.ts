import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { success } from "@/lib/api-response";
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refreshToken")?.value;
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }
    cookieStore.delete("accessToken");
    cookieStore.delete("refreshToken");
    return success({ message: "로그아웃되었습니다." });
  } catch {
    return success({ message: "로그아웃되었습니다." });
  }
}
