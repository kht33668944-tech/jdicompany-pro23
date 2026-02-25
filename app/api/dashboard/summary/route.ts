import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { success, errors } from "@/lib/api-response";
import { startOfDay, endOfWeek, startOfWeek } from "date-fns";

/** 전사 대시보드 - 모든 승인 사용자 공개 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const me = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { status: true },
    });
    if (!me || me.status !== "APPROVED") return errors.forbidden();

    const todayStart = startOfDay(new Date());
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

    const [todoCount, inProgressCount, doneCount, totalActive, overdueCount, overdueTasks, teams] =
      await Promise.all([
        prisma.task.count({ where: { status: "todo" } }),
        prisma.task.count({ where: { status: "in_progress" } }),
        prisma.task.count({ where: { status: "done" } }),
        prisma.task.count({ where: { status: { not: "cancelled" } } }),
        prisma.task.count({
          where: {
            dueDate: { lt: todayStart },
            status: { notIn: ["done", "cancelled"] },
          },
        }),
        prisma.task.findMany({
          where: {
            dueDate: { lt: todayStart },
            status: { notIn: ["done", "cancelled"] },
          },
          orderBy: { dueDate: "asc" },
          take: 10,
          include: {
            assignee: { select: { name: true } },
            team: { select: { name: true } },
          },
        }),
        prisma.team.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
      ]);

    const progressPercent = totalActive > 0 ? Math.round((doneCount / totalActive) * 100) : 0;

    const teamBoards = await Promise.all(
      teams.map(async (t) => {
        const [todo, inProgress, done, total] = await Promise.all([
          prisma.task.count({ where: { teamId: t.id, status: "todo" } }),
          prisma.task.count({ where: { teamId: t.id, status: "in_progress" } }),
          prisma.task.count({ where: { teamId: t.id, status: "done" } }),
          prisma.task.count({ where: { teamId: t.id, status: { not: "cancelled" } } }),
        ]);
        const teamProgress = total > 0 ? Math.round((done / total) * 100) : 0;
        const [todoTasks, inProgressTasks, doneTasks] = await Promise.all([
          prisma.task.findMany({
            where: { teamId: t.id, status: "todo" },
            orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
            take: 3,
            select: { id: true, title: true, status: true },
          }),
          prisma.task.findMany({
            where: { teamId: t.id, status: "in_progress" },
            orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
            take: 3,
            select: { id: true, title: true, status: true },
          }),
          prisma.task.findMany({
            where: { teamId: t.id, status: "done" },
            orderBy: { updatedAt: "desc" },
            take: 3,
            select: { id: true, title: true, status: true },
          }),
        ]);
        return {
          teamId: t.id,
          teamName: t.name,
          progressPercent: teamProgress,
          todoCount: todo,
          inProgressCount: inProgress,
          doneCount: done,
          todoTasks: todoTasks.map((x) => ({ id: x.id, title: x.title, status: x.status })),
          inProgressTasks: inProgressTasks.map((x) => ({ id: x.id, title: x.title, status: x.status })),
          doneTasks: doneTasks.map((x) => ({ id: x.id, title: x.title, status: x.status })),
        };
      })
    );

    let activities: { type: string; userName: string; text: string; createdAt: Date }[] = [];
    try {
      activities = await getActivityFeed(20);
    } catch {
      // Attendance/LeaveRequest 테이블이 없을 수 있음 (마이그레이션 전)
    }

    return success({
      summary: {
        todoCount,
        inProgressCount,
        doneCount,
        overdueCount,
        totalActive,
        progressPercent,
      },
      overdueTasks: overdueTasks.map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate,
        status: t.status,
        assigneeName: t.assignee.name,
        teamName: t.team.name,
      })),
      teamBoards,
      activities,
    });
  } catch (e) {
    if ((e as Error).message === "UNAUTHORIZED") return errors.unauthorized();
    return errors.server();
  }
}

async function getActivityFeed(limit: number) {
  const [histories, leaveRequests, attendances] = await Promise.all([
    prisma.taskHistory.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: { select: { name: true } },
        task: { select: { title: true } },
      },
    }),
    prisma.leaveRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { user: { select: { name: true } } },
    }),
    prisma.attendance.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { user: { select: { name: true } } },
    }),
  ]);

  const items: { type: string; userName: string; text: string; createdAt: Date }[] = [];

  histories.forEach((h) => {
    if (h.task) {
      const fieldLabel = h.field === "status" ? "상태" : h.field === "assignee" ? "담당자" : "우선순위";
      items.push({
        type: "task_history",
        userName: h.user.name,
        text: `"${h.task.title}" ${fieldLabel} 변경`,
        createdAt: h.createdAt,
      });
    }
  });
  leaveRequests.forEach((l) => {
    items.push({
      type: "leave",
      userName: l.user.name,
      text: `연차 신청 (${l.startDate.toISOString().slice(0, 10)} ~ ${l.endDate.toISOString().slice(0, 10)})`,
      createdAt: l.createdAt,
    });
  });
  attendances.forEach((a) => {
    if (a.checkIn && !a.checkOut) {
      items.push({
        type: "attendance",
        userName: a.user.name,
        text: "출근 체크",
        createdAt: a.checkIn,
      });
    } else if (a.checkOut) {
      items.push({
        type: "attendance",
        userName: a.user.name,
        text: "퇴근 체크",
        createdAt: a.checkOut,
      });
    }
  });

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return items.slice(0, limit);
}
