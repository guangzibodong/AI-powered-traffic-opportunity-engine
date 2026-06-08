import type { RelatedEntity, ScoreComponent, Task, TaskDetailViewModel } from "./types";

export function createTaskDetailViewModel(task: Task, fallback?: TaskDetailViewModel): TaskDetailViewModel {
  if (fallback && fallback.id === task.id) {
    return {
      ...fallback,
      ...task
    };
  }

  return {
    ...task,
    acceptanceCriteria: [
      "Evidence table includes source, metric, window, entity, and rule reason.",
      "Review state changes persist and remain scoped to this task.",
      "Sprint 1 does not publish live content or write product data."
    ],
    actionPlan: [
      {
        title: "Review evidence",
        description: "Confirm the search, commerce, and page evidence is enough to justify the task."
      },
      {
        title: "Record the decision",
        description: "Approve, reject, or snooze the task. This changes review state only."
      },
      {
        title: "Prepare later execution",
        description: "Keep the task ready for a future draft or manual execution workflow."
      }
    ],
    relatedEntities: buildRelatedEntities(task),
    ruleTrace: {
      dedupeKey: `${task.ruleId}-${task.id}`,
      ruleId: task.ruleId,
      runId: "planning-run-042",
      scoring: "deterministic_rules",
      version: "v1"
    },
    scoreComponents: buildScoreComponents(task),
    subtitle: `${task.evidence.length} evidence rows support this ${task.ruleId} task. Sprint 1 review changes task state only.`
  };
}

function buildScoreComponents(task: Task): ScoreComponent[] {
  return [
    { label: "Priority score", value: task.trafscore, weight: 45 },
    { label: "Evidence coverage", value: Math.min(100, Math.max(40, task.evidence.length * 30)), weight: 25 },
    { label: "Query coverage", value: Math.min(100, Math.max(35, task.objects.queries * 8)), weight: 20 },
    { label: "Execution safety", value: task.automationLevel === "recommend_only" ? 92 : 76, weight: 10 }
  ];
}

function buildRelatedEntities(task: Task): RelatedEntity[] {
  const entities = task.evidence.map<RelatedEntity>((row) => ({
    detail: `${row.source} / ${row.window}`,
    kind: row.type === "commerce" ? "product" : row.type === "page_graph" ? "page" : "query",
    title: row.entity
  }));

  if (entities.length > 0) {
    return entities;
  }

  return [
    {
      detail: `${task.objects.queries} queries / ${task.objects.products} products / ${task.objects.pages} pages`,
      kind: "query",
      title: task.ruleId
    }
  ];
}
