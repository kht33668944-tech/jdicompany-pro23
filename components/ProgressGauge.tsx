"use client";

export const STATUS_COLORS: Record<string, string> = {
  todo: "bg-slate-400",
  in_progress: "bg-blue-500",
  done: "bg-emerald-500",
  on_hold: "bg-amber-500",
  overdue: "bg-red-500",
};

export const STATUS_LABELS: Record<string, string> = {
  todo: "준비중",
  in_progress: "진행중",
  done: "완료",
  on_hold: "보류",
  overdue: "지연",
};

type Segment = { status: string; count: number; color: string };

type Props = {
  todoCount: number;
  inProgressCount: number;
  doneCount: number;
  onHoldCount?: number;
  overdueCount?: number;
  /** 전체 진행률 (0–100). done / total * 100 */
  progressPercent: number;
  /** 게이지 높이 클래스 (기본 크게) */
  height?: "sm" | "md" | "lg";
  showLegend?: boolean;
};

export default function ProgressGauge({
  todoCount,
  inProgressCount,
  doneCount,
  onHoldCount = 0,
  overdueCount = 0,
  progressPercent,
  height = "lg",
  showLegend = true,
}: Props) {
  const total =
    todoCount + inProgressCount + doneCount + onHoldCount + overdueCount || 1;
  const segments: Segment[] = [
    { status: "done", count: doneCount, color: STATUS_COLORS.done },
    { status: "in_progress", count: inProgressCount, color: STATUS_COLORS.in_progress },
    { status: "on_hold", count: onHoldCount, color: STATUS_COLORS.on_hold },
    { status: "overdue", count: overdueCount, color: STATUS_COLORS.overdue },
    { status: "todo", count: todoCount, color: STATUS_COLORS.todo },
  ].filter((s) => s.count > 0);

  const heightClass =
    height === "sm" ? "h-2" : height === "md" ? "h-3" : "h-4";

  return (
    <div className="w-full">
      <div
        className={`w-full ${heightClass} rounded-full overflow-hidden flex bg-slate-100`}
      >
        {segments.map((seg) => (
          <div
            key={seg.status}
            className={`${seg.color} transition-all`}
            style={{ width: `${(seg.count / total) * 100}%` }}
            title={`${STATUS_LABELS[seg.status]}: ${seg.count}`}
          />
        ))}
      </div>
      <div className="mt-1 text-sm font-medium text-slate-600">
        전체 진행률 <span className="text-emerald-600">{progressPercent}%</span>
      </div>
      {showLegend && (
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-400" /> 준비중 {todoCount}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> 진행중 {inProgressCount}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> 완료 {doneCount}
          </span>
          {onHoldCount > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> 보류 {onHoldCount}
            </span>
          )}
          {overdueCount > 0 && (
            <span className="flex items-center gap-1 text-red-600">
              <span className="w-2 h-2 rounded-full bg-red-500" /> 지연 {overdueCount}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
