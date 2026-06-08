import { CheckCircle2, CircleDashed } from "lucide-react";

import type { Integration } from "../lib/types";

type IntegrationStatusProps = {
  integrations: Integration[];
};

export function IntegrationStatus({ integrations }: IntegrationStatusProps) {
  return (
    <section className="panel" aria-labelledby="integration-status-heading">
      <div className="panel-heading">
        <h2 id="integration-status-heading">Integrations</h2>
      </div>
      <div className="integration-list">
        {integrations.map((integration) => {
          const connected = integration.status === "connected";
          const Icon = connected ? CheckCircle2 : CircleDashed;
          return (
            <div className="integration-row" key={integration.key}>
              <div>
                <strong>{integration.name}</strong>
                <span>{integration.description}</span>
              </div>
              <Icon
                aria-label={connected ? "Connected" : "Not connected"}
                className={connected ? "connected" : "pending"}
                size={20}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

