import type { VisibleTaskStatus } from "../../lib/types";
import type { TaskQueueMessages } from "./task-copy";

export function StatusPill({ status, t }: { status: VisibleTaskStatus; t: TaskQueueMessages }) {
  const className = status === "rejected" ? "risk" : status === "snoozed" ? "commerce" : "safe";
  return <span className={`status ${className}`}>{t[status]}</span>;
}
