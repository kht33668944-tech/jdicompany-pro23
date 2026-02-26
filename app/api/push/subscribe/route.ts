import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { success, errors } from "@/lib/api-response";

/** POST: 현재 사용자의 푸시 구독 저장 (endpoint 기준 upsert) */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const endpoint = body?.endpoint;
    const p256dh = body?.keys?.p256dh;
    const auth = body?.keys?.auth;

    if (!endpoint || typeof endpoint !== "string" || !p256dh || !auth) {
      return errors.badRequest("endpoint and keys.p256dh, keys.auth are required");
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        userId: session.sub,
        endpoint,
        p256dh: String(p256dh),
        auth: String(auth),
      },
      update: {
        userId: session.sub,
        p256dh: String(p256dh),
        auth: String(auth),
      },
    });

    return success({ ok: true });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}
