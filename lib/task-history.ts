import type { PrismaClient } from "@prisma/client";

export async function recordTaskHistory(
  prisma: PrismaClient,
  taskId: string,
  userId: string,
  changes: { status?: string; assigneeId?: string; priority?: string },
  oldTask: { status: string; assigneeId: string; priority: string }
) {
  const records: { taskId: string; userId: string; field: string; oldValue: string | null; newValue: string | null }[] = [];
  if (changes.status !== undefined && changes.status !== oldTask.status) {
    records.push({ taskId, userId, field: "status", oldValue: oldTask.status, newValue: changes.status });
  }
  if (changes.assigneeId !== undefined && changes.assigneeId !== oldTask.assigneeId) {
    records.push({ taskId, userId, field: "assignee", oldValue: oldTask.assigneeId, newValue: changes.assigneeId });
  }
  if (changes.priority !== undefined && changes.priority !== oldTask.priority) {
    records.push({ taskId, userId, field: "priority", oldValue: oldTask.priority, newValue: changes.priority });
  }
  if (records.length === 0) return;
  await prisma.taskHistory.createMany({
    data: records,
  });
}
