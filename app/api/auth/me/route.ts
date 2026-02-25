import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { success, errors } from "@/lib/api-response";

export async function GET() {
  try {
    const session = await requireSession();
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      include: { team: true },
    });
    if (!user || !user.isActive) return errors.unauthorized();

    return success({
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      teamId: user.teamId,
      teamName: user.team?.name ?? null,
      role: user.role,
      createdAt: user.createdAt,
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}
