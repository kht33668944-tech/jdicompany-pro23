import type { JWTPayload } from "./auth";

export function isCEO(role: string) {
  return role === "CEO";
}

export function isTeamLeader(role: string) {
  return role === "TEAM_LEADER";
}

/**
 * READ 권한:
 * CEO: 전체
 * TEAM_LEADER: 본인 팀
 * TEAM_MEMBER: 같은 팀 업무 조회 가능 (팀 페이지 등)
 */
export function canAccessTask(
  session: JWTPayload,
  task: { assigneeId: string; teamId: string },
  userTeamId: string | null
): boolean {
  if (isCEO(session.role)) return true;
  if (isTeamLeader(session.role)) return userTeamId === task.teamId;
  if (userTeamId === task.teamId) return true;
  return task.assigneeId === session.sub;
}

/**
 * WRITE 권한 (수정/삭제/상태변경):
 * CEO: 전체
 * TEAM_LEADER: 본인 팀
 * TEAM_MEMBER: 본인 담당(assigneeId) 업무만
 */
export function canWriteTask(
  session: JWTPayload,
  task: { assigneeId: string; teamId: string },
  userTeamId: string | null
): boolean {
  if (isCEO(session.role)) return true;
  if (isTeamLeader(session.role)) return userTeamId === task.teamId;
  return task.assigneeId === session.sub;
}

/**
 * 목록 조회 where 조건.
 * teamScope: true 이면 TEAM_MEMBER도 같은 팀 전체 업무 조회 가능.
 */
export function buildTaskWhere(
  session: JWTPayload,
  userTeamId: string | null,
  filters: {
    assigneeId?: string;
    teamId?: string;
    userId?: string;
    teamScope?: boolean;
  }
): { assigneeId?: string; teamId?: string } {
  if (isCEO(session.role)) {
    if (filters.userId) return { assigneeId: filters.userId };
    if (filters.teamId) return { teamId: filters.teamId };
    return {};
  }
  if (isTeamLeader(session.role)) {
    if (!userTeamId) return { assigneeId: session.sub };
    if (filters.userId) return { teamId: userTeamId, assigneeId: filters.userId };
    return { teamId: userTeamId };
  }
  if (filters.teamScope && userTeamId) {
    if (filters.teamId && filters.teamId !== userTeamId) return { assigneeId: "none" };
    if (filters.userId) return { teamId: userTeamId, assigneeId: filters.userId };
    return { teamId: userTeamId };
  }
  return { assigneeId: session.sub };
}
