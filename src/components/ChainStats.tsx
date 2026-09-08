import { formatNumber, type ChainInfo, type CrumbEvent } from "../lib/cookie";

export function ChainStats({
  chain,
  crumbs,
}: {
  chain: ChainInfo | null;
  crumbs: CrumbEvent[];
}) {
  const oldest = crumbs.reduce<number | null>(
    (min, crumb) =>
      crumb.blockTime == null ? min : min == null ? crumb.blockTime : Math.min(min, crumb.blockTime),
    null,
  );
  const latest = crumbs.reduce<number | null>(
    (max, crumb) =>
      crumb.blockTime == null ? max : max == null ? crumb.blockTime : Math.max(max, crumb.blockTime),
    null,
  );
  const span = oldest != null && latest != null ? Math.max(1, latest - oldest) : null;
  const rate = span ? (crumbs.length / span) * 3600 : null;

  const items = [
    { label: "RPC health", value: chain ? (chain.healthy ? "live" : "degraded") : "…" },
    { label: "Slot", value: chain ? formatNumber(chain.slot) : "…" },
    { label: "Epoch", value: chain ? `${chain.epoch} · ${chain.epochProgress}%` : "…" },
    { label: "Block height", value: chain ? formatNumber(chain.blockHeight) : "…" },
    { label: "Finalized votes", value: chain ? formatNumber(chain.validators) : "…" },
    { label: "TPS", value: chain && chain.tps != null ? formatNumber(chain.tps) : "…" },
    { label: "Network tx", value: chain ? formatNumber(chain.transactionCount) : "…" },
    { label: "Crumb rate", value: rate != null ? `${formatNumber(rate)}/hr` : "…" },
  ];

  return (
    <section className="stats-grid">
      {items.map((item) => (
        <article className="stat-card" key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </article>
      ))}
    </section>
  );
}
