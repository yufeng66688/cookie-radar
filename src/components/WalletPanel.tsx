import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";
import {
  COOKIE_SYMBOL,
  explorerAccount,
  formatNumber,
  formatUsd,
  shortAddress,
  type WalletAsset,
} from "../lib/cookie";

export function WalletPanel({
  balance,
  cookUsd,
  assets,
  assetError,
}: {
  balance: number | null;
  cookUsd: number | null;
  assets: WalletAsset[];
  assetError: string | null;
}) {
  const { publicKey, connected, wallet } = useWallet();
  const [copied, setCopied] = useState(false);

  async function copyAddress() {
    if (!publicKey) return;
    await navigator.clipboard.writeText(publicKey.toBase58());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!connected || !publicKey) {
    return (
      <section className="card wallet-card empty-state">
        <h2>Your wallet</h2>
        <p className="muted">
          Connect Nightly to see your COOK balance and Cookie Chain assets.
        </p>
      </section>
    );
  }

  return (
    <section className="card wallet-card">
      <div className="card-heading">
        <div>
          <h2>Your wallet</h2>
          <p className="muted">Signed in with {wallet?.adapter.name ?? "Wallet Standard"}</p>
        </div>
        <span className="status-pill status-ok">Connected</span>
      </div>

      <button type="button" className="address-button" onClick={() => void copyAddress()}>
        <span>{shortAddress(publicKey.toBase58(), 6)}</span>
        <span className="muted">{copied ? "Copied!" : "Copy"}</span>
      </button>
      <a
        className="link"
        href={explorerAccount(publicKey.toBase58())}
        target="_blank"
        rel="noreferrer"
      >
        View address in Cookiescan ↗
      </a>

      <div className="balance-grid">
        <div>
          <span className="metric-label">Balance</span>
          <strong className="metric-value">
            {formatNumber(balance, 6)} {COOKIE_SYMBOL}
          </strong>
        </div>
        <div>
          <span className="metric-label">Approx. value</span>
          <strong className="metric-value">
            {formatUsd(balance == null || cookUsd == null ? null : balance * cookUsd)}
          </strong>
        </div>
      </div>

      <div className="asset-section">
        <div className="card-heading">
          <h3>Cookie assets</h3>
          <span className="muted">{assets.length} indexed</span>
        </div>
        {assetError ? (
          <p className="inline-note">{assetError}</p>
        ) : assets.length === 0 ? (
          <p className="muted">No digital assets are indexed for this wallet yet.</p>
        ) : (
          <div className="asset-grid">
            {assets.map((asset) => (
              <article className="asset-tile" key={asset.id}>
                {asset.image ? (
                  <img src={asset.image} alt="" loading="lazy" />
                ) : (
                  <div className="asset-fallback">🍪</div>
                )}
                <div>
                  <strong>{asset.symbol || "Asset"}</strong>
                  <span className="muted">{asset.name}</span>
                  <span>
                    {asset.balance == null ? "—" : formatNumber(asset.balance, asset.decimals)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
