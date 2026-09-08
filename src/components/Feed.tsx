import { useState } from "react";
import {
  explorerTx,
  extractTags,
  formatRelative,
  formatTime,
  isBotMemo,
  shortAddress,
  type CrumbEvent,
} from "../lib/cookie";

export function Feed({
  crumbs,
  loading,
  error,
  onRefresh,
}: {
  crumbs: CrumbEvent[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  const [filter, setFilter] = useState<"all" | "human">("all");
  const visible =
    filter === "human" ? crumbs.filter((crumb) => !isBotMemo(crumb.message)) : crumbs;
  const tags = extractTags(crumbs.map((crumb) => crumb.message));

  return (
    <section className="card feed-card">
      <div className="card-heading">
        <div>
          <h2>Cookie radar feed</h2>
          <p className="muted">Latest public memo activity indexed from the chain.</p>
        </div>
        <button type="button" className="button button-ghost" onClick={onRefresh}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div className="filter-row">
        <button
          type="button"
          className={filter === "all" ? "filter active" : "filter"}
          onClick={() => setFilter("all")}
        >
          All
        </button>
        <button
          type="button"
          className={filter === "human" ? "filter active" : "filter"}
          onClick={() => setFilter("human")}
        >
          Human-ish
        </button>
        {tags.length ? (
          <div className="tag-row">
            {tags.map((tag) => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>
        ) : null}
      </div>

      {error ? <p className="inline-note">{error}</p> : null}
      {!loading && !error && visible.length === 0 ? (
        <p className="muted">No public memo activity in the current sample. Try again shortly.</p>
      ) : null}

      <div className="feed-list">
        {visible.slice(0, 30).map((crumb) => (
          <article className="crumb-row" key={crumb.id}>
            <div className="crumb-meta">
              <span className={`status-dot ${crumb.error ? "bad" : "good"}`} />
              <span className="muted">{formatRelative(crumb.blockTime)}</span>
              <span className="muted">{formatTime(crumb.blockTime)}</span>
              <span className="slot-label">slot {crumb.slot.toLocaleString("en-US")}</span>
            </div>
            <p className="crumb-message">{crumb.message}</p>
            <a
              className="link mono"
              href={explorerTx(crumb.signature)}
              target="_blank"
              rel="noreferrer"
            >
              {shortAddress(crumb.signature)} ↗
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
