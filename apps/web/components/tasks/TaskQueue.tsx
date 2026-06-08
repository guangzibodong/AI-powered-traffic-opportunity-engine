import type { Locale, Task } from "../../lib/types";
import { StatusPill } from "./StatusPill";
import {
  getTaskQueueLabels,
  localizeTaskAction,
  localizeTaskEvidence,
  localizeTaskTitle
} from "./task-copy";
import type { TaskQueueMessages } from "./task-copy";

type TaskQueueProps = {
  locale: Locale;
  onOpenTask: (task: Task) => void;
  t: TaskQueueMessages;
  tasks: Task[];
};

export function TaskQueue({ locale, onOpenTask, t, tasks }: TaskQueueProps) {
  const labels = getTaskQueueLabels(locale);

  return (
    <table className="queue-table">
      <thead>
        <tr>
          <th>{labels.priority}</th>
          <th>{labels.task}</th>
          <th>{labels.evidence}</th>
          <th>{labels.status}</th>
          <th>{labels.action}</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((task) => (
          <tr key={task.id}>
            <td data-label={labels.priority}>
              <span className={`score ${task.status === "rejected" ? "risk-score" : task.trafscore < 85 ? "mid" : ""}`}>{task.trafscore}</span>
            </td>
            <td data-label={labels.task}>
              <span className="row-title">{localizeTaskTitle(task.title, locale)}</span>
              <span className="task-meta mono">
                {task.ruleId} / rule v1
              </span>
              <div className="tag-row">
                <span className="pill search">{task.objects.queries} queries</span>
                {task.objects.products > 0 && <span className="pill commerce">{task.objects.products} SKUs</span>}
                <span className="pill">{task.objects.pages} pages</span>
              </div>
            </td>
            <td data-label={labels.evidence}>
              <div className="evidence-mini">
                {task.evidence.slice(0, 3).map((row) => (
                  <span key={`${task.id}-${row.source}-${row.metric}`}>{localizeTaskEvidence(row, locale)}</span>
                ))}
              </div>
            </td>
            <td data-label={labels.status}>
              <StatusPill status={task.status} t={t} />
            </td>
            <td data-label={labels.action}>
              <button
                className={`button ${task.automationLevel === "draft_assist_future" ? "disabled" : ""}`}
                onClick={() => onOpenTask(task)}
                type="button"
              >
                {localizeTaskAction(task, t)}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
