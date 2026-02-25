import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { success, created, errors } from "@/lib/api-response";

const KST = "Asia/Seoul";

/** 오늘 날짜를 Asia/Seoul 기준으로 반환 (저장/조회 일치용) */
function getTodayKST(): Date {
  const dateStr = new Date().toLocaleDateString("en-CA", { timeZone: KST });
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/** POST: 출근 또는 퇴근 기록. body: { action: "in" | "out" } */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const action = body?.action;

    if (action !== "in" && action !== "out") {
      return errors.badRequest('action은 "in" 또는 "out"이어야 합니다.');
    }

    const today = getTodayKST();
    let record = await prisma.attendance.findFirst({
      where: { userId: session.sub, date: today },
    });

    const now = new Date();

    if (action === "in") {
      if (record?.checkIn) {
        return errors.badRequest("이미 오늘 출근 기록이 있습니다.");
      }
      if (!record) {
        record = await prisma.attendance.create({
          data: { userId: session.sub, date: today, checkIn: now },
        });
      } else {
        record = await prisma.attendance.update({
          where: { id: record.id },
          data: { checkIn: now },
        });
      }
      return success({
        id: record.id,
        date: record.date,
        checkIn: record.checkIn,
        checkOut: record.checkOut,
      });
    }

    if (action === "out") {
      if (!record || !record.checkIn) {
        return errors.badRequest("먼저 출근 체크를 해주세요.");
      }
      if (record.checkOut) {
        return errors.badRequest("이미 오늘 퇴근 기록이 있습니다.");
      }
      record = await prisma.attendance.update({
        where: { id: record.id },
        data: { checkOut: now },
      });
      return success({
        id: record.id,
        date: record.date,
        checkIn: record.checkIn,
        checkOut: record.checkOut,
      });
    }

    return errors.badRequest("잘못된 요청입니다.");
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}
