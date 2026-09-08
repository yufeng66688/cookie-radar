import { useWallet } from "@solana/wallet-adapter-react";
import { useCallback, useEffect, useState } from "react";
import { ActivityChart } from "./components/ActivityChart";
import { ChainStats } from "./components/ChainStats";
import { CookieBoxQuote } from "./components/CookieBoxQuote";
import { CookieConnect } from "./components/CookieConnect";
import { CrumbComposer } from "./components/CrumbComposer";
import { Feed } from "./components/Feed";
import { MarketRadar } from "./components/MarketRadar";
import { WalletPanel } from "./components/WalletPanel";
import {
  BRIDGE_URL,
  DOCS_URL,
  EXPLORER_URL,
  NIGHTLY_URL,
  connection,
  fetchChainInfo,
  fetchCrumbs,
  fetchMarkets,
  fetchWalletAssets,
  type ChainInfo,
  type CrumbEvent,
  type MarketSnapshot,
  type WalletAsset,
} from "./lib/cookie";

export default function App() {
  const { publicKey, connected } = useWallet();
  const [chain, setChain] = useState<ChainInfo | null>(null);
  const [chainError, setChainError] = useState<string | null>(null);
  const [crumbs, setCrumbs] = useState<CrumbEvent[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [markets, setMarkets] = useState<MarketSnapshot | null>(null);
  const [marketLoading, setMarketLoading] = useState(true);
  const [marketError, setMarketError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [assets, setAssets] = useState<WalletAsset[]>([]);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);

  const loadChain = useCallback(async () => {
    try {
      const next = await fetchChainInfo();
      setChain(next);
      setChainError(null);
    } catch (error) {
      setChainError(error instanceof Error ? error.message : "Could not read Cookie Chain RPC.");
    }
  }, []);

  const loadCrumbs = useCallback(async () => {
    setFeedLoading(true);
    try {
      const next = await fetchCrumbs(120);
      setCrumbs(next);
      setFeedError(null);
    } catch (error) {
      setFeedError(error instanceof Error ? error.message : "Could not load the activity feed.");
    } finally {
      setFeedLoading(false);
    }
  }, []);

  const loadMarkets = useCallback(async () => {
    setMarketLoading(true);
    try {
      const next = await fetchMarkets();
      setMarkets(next);
      setMarketError(null);
    } catch (error) {
      setMarketError(error instanceof Error ? error.message : "Could not load Cookiescan markets.");
    } finally {
      setMarketLoading(false);
    }
  }, []);

  const loadWallet = useCallback(async () => {
    if (!connected || !publicKey) {
      setBalance(null);
      setAssets([]);
      setAssetError(null);
      return;
    }
    setWalletLoading(true);
    try {
      const [lamports, walletAssets] = await Promise.all([
        connection.getBalance(publicKey, "confirmed"),
        fetchWalletAssets(publicKey),
      ]);
      setBalance(lamports / 1e9);
      setAssets(walletAssets);
      setAssetError(null);
    } catch (error) {
      setAssetError(error instanceof Error ? error.message : "Could not load wallet assets.");
    } finally {
      setWalletLoading(false);
    }
  }, [connected, publicKey]);

  useEffect(() => {
    void loadChain();
    void loadCrumbs();
    void loadMarkets();
    const interval = window.setInterval(() => {
      void loadChain();
      void loadCrumbs();
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [loadChain, loadCrumbs, loadMarkets]);

  useEffect(() => {
    void loadWallet();
    if (!connected || !publicKey) return;
    const interval = window.setInterval(() => void loadWallet(), 30_000);
    return () => window.clearInterval(interval);
  }, [connected, publicKey, loadWallet]);

  function refreshAll() {
    void loadChain();
    void loadCrumbs();
    void loadMarkets();
    if (connected && publicKey) void loadWallet();
  }

  return (
    <div className="page">
      <header className="hero">
        <div className="brand-row">
          <div className="brand">
            <span className="brand-icon">🍪</span>
            <div>
              <strong>Cookie Radar</strong>
              <small>a Cookie Chain cApp</small>
            </div>
          </div>
          <div className="hero-links">
            <a href={DOCS_URL} target="_blank" rel="noreferrer">Docs</a>
            <a href={EXPLORER_URL} target="_blank" rel="noreferrer">Explorer</a>
            <a href={NIGHTLY_URL} target="_blank" rel="noreferrer">Nightly</a>
          </div>
        </div>
        <div className="hero-copy">
          <div>
            <p className="eyebrow">Live on Cookie Chain · SVM</p>
            <h1>See the oven. Leave a crumb.</h1>
            <p className="lede">
              A public activity dashboard plus an on-chain message board. Connect
              Nightly, switch to Cookie Chain, sign one tiny memo transaction, and
              watch it land in the live radar.
            </p>
          </div>
          <CookieConnect onConnected={() => void loadWallet()} />
        </div>
      </header>

      {chainError ? (
        <div className="alert alert-warn">
          Chain data is temporarily unavailable: <span className="mono">{chainError}</span>
        </div>
      ) : null}

      <ChainStats chain={chain} crumbs={crumbs} />

      <div className="main-grid">
        <div className="left-column">
          <CrumbComposer onSent={() => {
            void loadCrumbs();
            void loadWallet();
          }} />
          <ActivityChart crumbs={crumbs} />
          <WalletPanel
            balance={balance}
            cookUsd={markets?.cookUsd ?? null}
            assets={assets}
            assetError={assetError}
          />
          {walletLoading ? <p className="muted center-note">Refreshing wallet…</p> : null}
        </div>
        <div className="right-column">
          <Feed
            crumbs={crumbs}
            loading={feedLoading}
            error={feedError}
            onRefresh={() => void loadCrumbs()}
          />
        </div>
      </div>

      <MarketRadar
        markets={markets}
        loading={marketLoading}
        error={marketError}
      />

      <CookieBoxQuote
        onSwapExecuted={() => {
          void loadWallet();
          void loadMarkets();
          void loadCrumbs();
        }}
      />

      <section className="card bridge-guide">
        <div>
          <h2>First COOK from Solana</h2>
          <p className="muted">
            Cookie Chain fees are paid in native COOK. If your Nightly wallet has never
            used this network, bridge a small amount through the community bridge before
            posting your first crumb.
          </p>
        </div>
        <ol className="guide-steps">
          <li><span>1</span>Open <a href={BRIDGE_URL} target="_blank" rel="noreferrer">bridge.cookiescan.io</a></li>
          <li><span>2</span>Connect Nightly and review the network swap</li>
          <li><span>3</span>Send the amount shown on screen</li>
          <li><span>4</span>Return here, sign your first crumb</li>
        </ol>
      </section>

      <footer className="footer">
        <span>Built for the Superteam Earn Cookie Chain bounty.</span>
        <span className="muted">Read-only market/DAS data from Cookiescan · Transactions stay user-signed.</span>
      </footer>

      <button type="button" className="floating-refresh" onClick={refreshAll} aria-label="Refresh all data">
        ↻
      </button>
    </div>
  );
}
