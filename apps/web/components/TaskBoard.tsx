import { ArrowRight, FilePenLine } from "lucide-react";

import type { Task } from "../lib/types";

type TaskBoardProps = {
  tasks: Task[];
};

export function TaskBoard({ tasks }: TaskBoardProps) {
  return (
    <section className="panel" aria-labelledby="task-board-heading">
      <div className="panel-heading">
        <h2 id="task-board-heading">Priority tasks</h2>
        <button className="ghost-action" type="button">
          <ArrowRight aria-hidden="true" size={16} />
          View all
        </button>
      </div>
      <div className="task-list">
        {tasks.map((task) => (
          <article className="task-row" key={task.id}>
            <div className="task-title">
              <FilePenLine aria-hidden="true" size={20} />
              <div>
                <h3>{task.title}</h3>
                <p className="task-meta">
                  {task.category} - {task.automationLevel}
                </p>
              </div>
            </div>
            <div>
              <span className="score-pill">{task.trafscore}</span>
              <span className="status-pill">{task.status}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

