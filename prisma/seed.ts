import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const teamNames = ["마케팅팀", "PM(기획)팀", "CS팀", "디자인팀"];
  const teams: { id: string; name: string; description: string }[] = [];

  for (const name of teamNames) {
    const t = await prisma.team.upsert({
      where: { name },
      update: {},
      create: {
        name,
        description: `${name} 업무 담당`,
      },
    });
    teams.push(t as { id: string; name: string; description: string });
  }

  const ceoPassword = await hash("ceo1234", 10);
  const ceo = await prisma.user.upsert({
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
  console.log("CEO 계정 생성:", ceo.username);

  const memberPassword = await hash("member1234", 10);
  await prisma.user.upsert({
    where: { username: "member@company.com" },
    update: { status: "APPROVED" },
    create: {
      username: "member@company.com",
      passwordHash: memberPassword,
      name: "홍길동",
      email: "member@company.com",
      role: "TEAM_MEMBER",
      teamId: teams[0].id,
      status: "APPROVED",
    },
  });
  console.log("테스트 팀원 계정 생성: member@company.com (마케팅팀)");

  console.log("시드 완료. CEO: ceo@company.com / ceo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
