/**
 * 일회성 스크립트: redgoom 사용자 승인 + 대표(CEO) 계정 생성
 * 실행: npx tsx prisma/approve-redgoom-and-ceo.ts
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const redgoom = await prisma.user.findUnique({ where: { username: "redgoom" } });
  if (redgoom) {
    await prisma.user.update({
      where: { id: redgoom.id },
      data: { status: "APPROVED" },
    });
    console.log("redgoom 계정 승인 완료 (status: APPROVED)");
  } else {
    console.log("redgoom 사용자가 DB에 없습니다. 건너뜁니다.");
  }

  const ceoPassword = await hash("ceo1234", 10);
  await prisma.user.upsert({
    where: { username: "ceo@company.com" },
    update: { status: "APPROVED" },
    create: {
      username: "ceo@company.com",
      passwordHash: ceoPassword,
      name: "대표",
      email: "ceo@company.com",
      role: "CEO",
      teamId: null,
      status: "APPROVED",
    },
  });
  console.log("대표(CEO) 계정 준비 완료. 로그인: ceo@company.com / ceo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
