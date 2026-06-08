import { Activity, Boxes, Gauge, Search, Send, ShieldCheck } from "lucide-react";

import { AppShell } from "../components/AppShell";
import { IntegrationStatus } from "../components/IntegrationStatus";
import { MetricTile } from "../components/MetricTile";
import { OpportunityPanel } from "../components/OpportunityPanel";
import { TaskBoard } from "../components/TaskBoard";
import { integrations, metrics, opportunities, tasks } from "../lib/mock-data";

export function App() {
  return (
    <AppShell>
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">Outdoor Coffee Gear Demo Store</p>
          <h1>Traffic operations board</h1>
        </div>
        <button className="primary-action" type="button">
          <Send aria-hidden="true" size={18} />
          Run weekly planning
        </button>
      </section>

      <section className="metric-grid" aria-label="Traffic summary">
        <MetricTile icon={Gauge} label="TrafScore avg" value={metrics.trafscoreAverage} trend="+8 this week" />
        <MetricTile icon={Search} label="Query gaps" value={metrics.queryGaps} trend="12 unmapped" />
        <MetricTile icon={Boxes} label="Products ready" value={metrics.productsReady} trend="5 high fit" />
        <MetricTile icon={Activity} label="Tracked assets" value={metrics.trackedAssets} trend="3 gaining clicks" />
      </section>

      <section className="workbench-grid">
        <TaskBoard tasks={tasks} />
        <div className="side-rail">
          <IntegrationStatus integrations={integrations} />
          <OpportunityPanel icon={ShieldCheck} opportunities={opportunities} />
        </div>
      </section>
    </AppShell>
  );
}

