import type { LucideIcon } from "lucide-react";

type MetricTileProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  trend: string;
};

export function MetricTile({ icon: Icon, label, value, trend }: MetricTileProps) {
  return (
    <article className="tile">
      <div className="tile-header">
        <span>{label}</span>
        <Icon aria-hidden="true" size={18} />
      </div>
      <strong>{value}</strong>
      <span>{trend}</span>
    </article>
  );
}

