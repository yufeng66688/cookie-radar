import { buildActivityBuckets, formatNumber, type CrumbEvent } from "../lib/cookie";

export function ActivityChart({ crumbs }: { crumbs: CrumbEvent[] }) {
  const buckets = buildActivityBuckets(crumbs);
  const max = Math.max(1, ...buckets.map((bucket) => bucket.count));
  const width = 640;
  const height = 150;
  const padding = 10;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const barWidth = chartWidth / Math.max(1, buckets.length) - 10;

  return (
    <section className="card chart-card">
      <div className="card-heading">
        <div>
          <h2>Crumb activity</h2>
          <p className="muted">Distribution across the current public memo sample.</p>
        </div>
        <span className="metric-label">{formatNumber(crumbs.length)} events</span>
      </div>
      {buckets.length < 2 ? (
        <p className="muted">More activity is needed to draw a useful chart.</p>
      ) : (
        <div className="chart-wrap">
          <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Crumb activity chart">
            <g>
              {buckets.map((bucket, index) => {
                const barHeight = Math.max(4, (bucket.count / max) * chartHeight);
                const x = padding + index * (chartWidth / buckets.length);
                const y = height - padding - barHeight;
                return (
                  <g key={`${bucket.label}-${index}`}>
                    <rect
                      x={x + 5}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      rx={6}
                      className="chart-bar"
                    />
                    <text x={x + 5} y={height - 2} className="chart-label">
                      {bucket.label}
                    </text>
                    <text x={x + 5} y={Math.max(12, y - 6)} className="chart-value">
                      {bucket.count}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      )}
    </section>
  );
}
