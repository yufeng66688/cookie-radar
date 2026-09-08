import {
  COOKIEBOX_URL,
  COOKIESWAP_URL,
  COOKOVEN_URL,
  formatNumber,
  formatUsd,
  shortAddress,
  type MarketSnapshot,
} from "../lib/cookie";

export function MarketRadar({
  markets,
  loading,
  error,
}: {
  markets: MarketSnapshot | null;
  loading: boolean;
  error: string | null;
}) {
  return (
    <section className="card market-card">
      <div className="card-heading">
        <div>
          <h2>Liquidity radar</h2>
          <p className="muted">Largest Cookie Chain pools from Cookiescan.</p>
        </div>
        <div className="market-tools">
          <a href={COOKIEBOX_URL} target="_blank" rel="noreferrer">Cookiebox ↗</a>
          <a href={COOKIESWAP_URL} target="_blank" rel="noreferrer">Cookieswap ↗</a>
          <a href={COOKOVEN_URL} target="_blank" rel="noreferrer">CookOven ↗</a>
        </div>
      </div>

      <div className="market-summary">
        <div>
          <span className="metric-label">COOK price</span>
          <strong className="metric-value">{formatUsd(markets?.cookUsd)}</strong>
        </div>
        <div>
          <span className="metric-label">Indexed pools</span>
          <strong className="metric-value">{formatNumber(markets?.count ?? null)}</strong>
        </div>
      </div>

      {error ? <p className="inline-note">{error}</p> : null}
      {loading && !markets ? <p className="muted">Loading live pools…</p> : null}
      {!loading && !error && !markets?.pools.length ? (
        <p className="muted">No pools with measured liquidity right now.</p>
      ) : null}

      <div className="pool-list">
        {(markets?.pools ?? []).map((pool) => (
          <div className="pool-row" key={pool.id}>
            <span className="venue-badge">{pool.venue.split(" ")[0]}</span>
            <strong>{pool.symbol}</strong>
            <span className="muted mono">{shortAddress(pool.id, 5)}</span>
            <span className="pool-liquidity">{formatUsd(pool.liquidity)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
