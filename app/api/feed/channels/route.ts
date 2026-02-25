import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { success, created, errors } from "@/lib/api-response";

const DEFAULT_CHANNEL_SLUG = "general";

function slugify(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9가-힣-_]/g, "")
    .toLowerCase() || "channel";
}

export async function GET() {
  try {
    await requireSession();

    let channels = await prisma.feedChannel.findMany({
      orderBy: [{ groupName: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    });

    if (channels.length === 0) {
      await prisma.feedChannel.createMany({
        data: [
          { name: "일반", slug: DEFAULT_CHANNEL_SLUG, groupName: "메인", sortOrder: 0 },
          { name: "업무 보고 (상시)", slug: "work-report-always", groupName: "메인", sortOrder: 1 },
          { name: "업무 보고 (정기)", slug: "work-report-regular", groupName: "메인", sortOrder: 2 },
        ],
      });
      channels = await prisma.feedChannel.findMany({
        orderBy: [{ groupName: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      });
    }

    const byGroup = channels.reduce<Record<string, { id: string; name: string; slug: string; sortOrder: number }[]>>(
      (acc, ch) => {
        const g = ch.groupName || "메인";
        if (!acc[g]) acc[g] = [];
        acc[g].push({ id: ch.id, name: ch.name, slug: ch.slug, sortOrder: ch.sortOrder });
        return acc;
      },
      {}
    );

    return success({ channels, byGroup: Object.entries(byGroup).map(([groupName, list]) => ({ groupName, list })) });
  } catch (e) {
    const err = e as Error;
    if (err.message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const groupName = typeof body.groupName === "string" ? body.groupName.trim() || "메인" : "메인";
    if (!name) return errors.badRequest("채널 이름을 입력해주세요.");

    const baseSlug = slugify(name);
    let slug = baseSlug;
    let n = 0;
    while (await prisma.feedChannel.findUnique({ where: { slug } })) {
      n += 1;
      slug = `${baseSlug}-${n}`;
    }

    const maxOrder = await prisma.feedChannel.findFirst({
      where: { groupName },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const sortOrder = (maxOrder?.sortOrder ?? -1) + 1;

    const channel = await prisma.feedChannel.create({
      data: { name, slug, groupName, sortOrder },
    });

    return created({ id: channel.id, name: channel.name, slug: channel.slug, groupName: channel.groupName, sortOrder: channel.sortOrder });
  } catch (e) {
    const err = e as Error;
    if (err.message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}
