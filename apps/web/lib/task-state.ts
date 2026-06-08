import type { BoardViewModel, Task, TaskDetailViewModel, VisibleTaskStatus } from "./types";

export const TASK_STATUS_STORAGE_KEY = "trafscope:sprint1:task-statuses";

export type TaskStatusMap = Partial<Record<string, VisibleTaskStatus>>;

const visibleTaskStatuses = new Set<VisibleTaskStatus>(["new", "approved", "rejected", "snoozed"]);

export function isVisibleTaskStatus(value: unknown): value is VisibleTaskStatus {
  return typeof value === "string" && visibleTaskStatuses.has(value as VisibleTaskStatus);
}

export function loadTaskStatusMap(storage = getBrowserStorage()): TaskStatusMap {
  if (!storage) return {};

  try {
    const raw = storage.getItem(TASK_STATUS_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, VisibleTaskStatus] =>
        Boolean(entry[0]) && isVisibleTaskStatus(entry[1])
      )
    );
  } catch {
    return {};
  }
}

export function saveTaskStatusMap(statuses: TaskStatusMap, storage = getBrowserStorage()) {
  if (!storage) return;

  storage.setItem(TASK_STATUS_STORAGE_KEY, JSON.stringify(statuses));
}

export function updateTaskStatusMap(
  current: TaskStatusMap,
  taskId: string,
  status: VisibleTaskStatus
): TaskStatusMap {
  return {
    ...current,
    [taskId]: status
  };
}

export function applyTaskStatusesToBoard(
  board: BoardViewModel,
  statuses: TaskStatusMap
): BoardViewModel {
  return {
    ...board,
    tasks: board.tasks.map((task) => applyTaskStatus(task, statuses))
  };
}

export function applyTaskStatusToDetail(
  task: TaskDetailViewModel,
  statuses: TaskStatusMap
): TaskDetailViewModel {
  return applyTaskStatus(task, statuses);
}

function applyTaskStatus<TTask extends Task>(task: TTask, statuses: TaskStatusMap): TTask {
  const status = statuses[task.id];
  if (!status) return task;

  return {
    ...task,
    status
  };
}

function getBrowserStorage() {
  if (typeof window === "undefined") return undefined;
  return window.localStorage;
}
