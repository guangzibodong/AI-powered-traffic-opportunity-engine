import type { LucideIcon } from "lucide-react";

import type { Opportunity } from "../lib/types";

type OpportunityPanelProps = {
  icon: LucideIcon;
  opportunities: Opportunity[];
};

export function OpportunityPanel({ icon: Icon, opportunities }: OpportunityPanelProps) {
  return (
    <section className="panel" aria-labelledby="opportunity-heading">
      <div className="panel-heading">
        <h2 id="opportunity-heading">Top opportunities</h2>
        <Icon aria-hidden="true" size={18} />
      </div>
      <div className="opportunity-list">
        {opportunities.map((opportunity) => (
          <article className="opportunity-row" key={opportunity.id}>
            <h3>{opportunity.title}</h3>
            <p className="task-meta">{opportunity.summary}</p>
            <span className="score-pill">TrafScore {opportunity.trafscore}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

