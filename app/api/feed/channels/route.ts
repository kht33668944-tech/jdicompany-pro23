import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { success, errors } from "@/lib/api-response";

const DEFAULT_CHANNEL_SLUG = "general";

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
