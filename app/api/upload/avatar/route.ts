import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { requireSession } from "@/lib/auth";
import { success, errors } from "@/lib/api-response";

const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2MB
const UPLOAD_DIR = process.env.UPLOAD_AVATAR_PATH || path.join(process.cwd(), "public", "uploads", "avatar");

export async function POST(req: NextRequest) {
  try {
    await requireSession();

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return errors.badRequest("파일을 선택해주세요.");
    if (!file.type.startsWith("image/")) return errors.badRequest("이미지 파일만 업로드 가능합니다.");
    if (file.size > AVATAR_MAX_BYTES) return errors.badRequest("파일 크기는 2MB 이하여야 합니다.");

    const ext = file.type.includes("png") ? ".png" : file.type.includes("gif") ? ".gif" : file.type.includes("webp") ? ".webp" : ".jpg";
    const baseName = randomUUID() + ext;
    await mkdir(UPLOAD_DIR, { recursive: true });
    const filePath = path.join(UPLOAD_DIR, baseName);
    await writeFile(filePath, Buffer.from(await file.arrayBuffer()));
    const url = "/uploads/avatar/" + baseName;

    return success({ url });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}
