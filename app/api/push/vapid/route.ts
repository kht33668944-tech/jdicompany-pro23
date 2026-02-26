import { success, errors } from "@/lib/api-response";

/** GET: Web Push용 VAPID 공개키 (클라이언트 구독 시 applicationServerKey로 사용) */
export async function GET() {
  const publicKey =
    process.env.VAPID_PUBLIC_KEY ?? process.env.WEB_PUSH_PUBLIC_KEY ?? null;
  if (!publicKey) return errors.server("VAPID public key not configured");
  return success({ publicKey });
}
