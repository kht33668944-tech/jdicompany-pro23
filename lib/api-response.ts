import { NextResponse } from "next/server";

export function success<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function created<T>(data: T) {
  return NextResponse.json({ success: true, data }, { status: 201 });
}

export function error(code: string, message: string, status: number) {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status }
  );
}

export const errors = {
  badRequest: (msg = "잘못된 요청입니다.") => error("INVALID_REQUEST", msg, 400),
  unauthorized: (msg = "로그인이 필요합니다.") => error("UNAUTHORIZED", msg, 401),
  forbidden: (msg = "권한이 없습니다.") => error("FORBIDDEN", msg, 403),
  notFound: (msg = "리소스를 찾을 수 없습니다.") => error("NOT_FOUND", msg, 404),
  duplicate: (msg = "이미 존재합니다.") => error("DUPLICATE", msg, 409),
  server: (msg = "서버 오류가 발생했습니다.") => error("INTERNAL_ERROR", msg, 500),
};
