import { useWallet } from "@solana/wallet-adapter-react";
import { Transaction, VersionedTransaction } from "@solana/web3.js";
import { useState } from "react";
import {
  COOKIEBOX_QUOTE,
  COOKIEBOX_SWAP_TX,
  COOKIEBOX_URL,
  connection,
  explorerTx,
  formatNumber,
  shortAddress,
} from "../lib/cookie";

type Preset = {
  id: string;
  inputMint: string;
  outputMint: string;
  inputSymbol: string;
  outputSymbol: string;
  inputDecimals: number;
  outputDecimals: number;
};

const presets: Preset[] = [
  {
    id: "cook-bcook",
    inputMint: "So11111111111111111111111111111111111111112",
    outputMint: "EkPafx58mgwkEnGwo62jXhXDAdJ37Z8G8MFBRPsr9uhz",
    inputSymbol: "COOK",
    outputSymbol: "bCOOK",
    inputDecimals: 9,
    outputDecimals: 9,
  },
  {
    id: "bcook-cook",
    inputMint: "EkPafx58mgwkEnGwo62jXhXDAdJ37Z8G8MFBRPsr9uhz",
    outputMint: "So11111111111111111111111111111111111111112",
    inputSymbol: "bCOOK",
    outputSymbol: "COOK",
    inputDecimals: 9,
    outputDecimals: 9,
  },
  {
    id: "cook-trash",
    inputMint: "So11111111111111111111111111111111111111112",
    outputMint: "3Dk9AYeoMZRHg9PmA2LrxrDGyJsNPTVGbRMbNKCsEt23",
    inputSymbol: "COOK",
    outputSymbol: "TRS",
    inputDecimals: 9,
    outputDecimals: 6,
  },
];

type Quote = {
  inAmount: string;
  outAmount: string;
  netOutAmount: string;
  minOutAmount: string;
  feePct: number;
  feeAmount: string;
  priceImpactPct: number | null;
  path: string[];
  isSplit: boolean;
  isMultiHop: boolean;
  segments: Array<{
    pool: string;
    venue: string;
    inAmount: string;
    outAmount: string;
    percentage: number;
  }>;
};

type SwapBuild = {
  transactionBase64: string;
  blockhash: string;
  lastValidBlockHeight: number;
  route: Quote;
};

type SwapStatus =
  | { kind: "idle" }
  | { kind: "signing" }
  | { kind: "sending" }
  | { kind: "confirming"; signature: string }
  | { kind: "confirmed"; signature: string }
  | { kind: "unconfirmed"; signature: string; message: string }
  | { kind: "error"; message: string };

function toRaw(amount: string, decimals: number): string | null {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return null;
  return String(Math.round(value * 10 ** decimals));
}

function fromRaw(raw: string, decimals: number): number {
  return Number(raw) / 10 ** decimals;
}

export function CookieBoxQuote({ onSwapExecuted }: { onSwapExecuted: () => void }) {
  const { publicKey, connected, sendTransaction } = useWallet();
  const [presetId, setPresetId] = useState(presets[0].id);
  const [amount, setAmount] = useState("1");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [swapStatus, setSwapStatus] = useState<SwapStatus>({ kind: "idle" });
  const preset = presets.find((item) => item.id === presetId) ?? presets[0];

  async function getQuote() {
    const raw = toRaw(amount, preset.inputDecimals);
    if (!raw) {
      setError("Enter a positive amount first.");
      return;
    }
    setLoading(true);
    setError(null);
    setSwapStatus({ kind: "idle" });
    try {
      const params = new URLSearchParams({
        inputMint: preset.inputMint,
        outputMint: preset.outputMint,
        amount: raw,
        slippageBps: "500",
      });
      const response = await fetch(`${COOKIEBOX_QUOTE}?${params}`);
      const body = (await response.json()) as { route?: Quote; error?: string };
      if (!body.route) throw new Error(body.error ?? "No route found.");
      setQuote(body.route);
    } catch (err) {
      setQuote(null);
      setError(err instanceof Error ? err.message : "Could not get a Cookiebox quote.");
    } finally {
      setLoading(false);
    }
  }

  async function executeSwap() {
    if (!connected || !publicKey) return;
    const raw = toRaw(amount, preset.inputDecimals);
    if (!raw) return;
    setSwapStatus({ kind: "signing" });
    let signature = "";
    try {
      const response = await fetch(COOKIEBOX_SWAP_TX, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputMint: preset.inputMint,
          outputMint: preset.outputMint,
          amount: raw,
          slippageBps: 500,
          owner: publicKey.toBase58(),
        }),
      });
      const body = (await response.json()) as SwapBuild & { error?: string };
      if (!body.transactionBase64) {
        throw new Error(body.error ?? "Cookiebox could not build this route.");
      }
      const bytes = Uint8Array.from(atob(body.transactionBase64), (char) => char.charCodeAt(0));
      let transaction: Transaction | VersionedTransaction;
      try {
        transaction = VersionedTransaction.deserialize(bytes);
      } catch {
        transaction = Transaction.from(bytes);
      }
      setSwapStatus({ kind: "sending" });
      const preflight =
        transaction instanceof VersionedTransaction
          ? await connection.simulateTransaction(transaction, {
              sigVerify: false,
              replaceRecentBlockhash: true,
              commitment: "confirmed",
            })
          : await connection.simulateTransaction(transaction);
      if (preflight.value.err) {
        throw new Error("Simulation failed. The route may be stale; get a new quote.");
      }
      signature = await sendTransaction(transaction, connection, {
        skipPreflight: true,
        maxRetries: 3,
      });
      setSwapStatus({ kind: "confirming", signature });
      await connection.confirmTransaction(
        {
          signature,
          blockhash: body.blockhash,
          lastValidBlockHeight: body.lastValidBlockHeight,
        },
        "confirmed",
      );
      setSwapStatus({ kind: "confirmed", signature });
      onSwapExecuted();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (signature && /blockheight|expired|timeout|not found/i.test(message)) {
        setSwapStatus({ kind: "unconfirmed", signature, message });
      } else {
        setSwapStatus({ kind: "error", message: friendlySwapError(message) });
      }
    }
  }

  function friendlySwapError(raw: string): string {
    if (/reject|cancel|declined/i.test(raw)) return "You rejected the swap signature.";
    if (/insufficient|0x1/i.test(raw)) return "Insufficient token balance or COOK for fees.";
    if (/simulation|stale|blockhash/i.test(raw)) return raw;
    return raw;
  }

  return (
    <section className="card quote-card">
      <div className="card-heading">
        <div>
          <h2>Cookiebox quote</h2>
          <p className="muted">Live multi-venue route from the official aggregator.</p>
        </div>
        <a href={COOKIEBOX_URL} target="_blank" rel="noreferrer">Open Cookiebox ↗</a>
      </div>

      <div className="quote-form">
        <label>
          <span>Route</span>
          <select
            value={presetId}
            onChange={(event) => {
              setPresetId(event.target.value);
              setQuote(null);
              setError(null);
              setSwapStatus({ kind: "idle" });
            }}
          >
            {presets.map((item) => (
              <option key={item.id} value={item.id}>
                {item.inputSymbol} → {item.outputSymbol}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Amount</span>
          <input
            type="number"
            min="0"
            step="any"
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              setQuote(null);
              setError(null);
              setSwapStatus({ kind: "idle" });
            }}
          />
        </label>
        <button
          type="button"
          className="button button-primary"
          onClick={() => void getQuote()}
          disabled={loading}
        >
          {loading ? "Quoting…" : "Get quote"}
        </button>
      </div>

      {error ? <p className="inline-note">{error}</p> : null}
      {quote ? (
        <div className="quote-result">
          <div className="quote-output">
            <span>Estimated output</span>
            <strong>
              {formatNumber(fromRaw(quote.netOutAmount, preset.outputDecimals), 6)} {preset.outputSymbol}
            </strong>
          </div>
          <div className="quote-meta">
            <span>Price impact {quote.priceImpactPct == null ? "—" : `${quote.priceImpactPct.toFixed(3)}%`}</span>
            <span>Fee {quote.feePct}%</span>
            <span>{quote.isMultiHop ? "Multi-hop" : quote.isSplit ? "Split" : "Direct"}</span>
          </div>
          <div className="route-list">
            {quote.segments.map((segment, index) => (
              <div className="route-row" key={`${segment.pool}-${index}`}>
                <span className="venue-badge">{segment.venue}</span>
                <span>{formatNumber(fromRaw(segment.inAmount, preset.inputDecimals), 4)} {preset.inputSymbol}</span>
                <span>→</span>
                <span>{formatNumber(fromRaw(segment.outAmount, preset.outputDecimals), 4)} {preset.outputSymbol}</span>
                <span className="mono muted">{shortAddress(segment.pool, 5)}</span>
              </div>
            ))}
          </div>
          <div className="quote-actions">
            {!connected ? (
              <p className="muted">Connect Nightly to execute this route.</p>
            ) : (
              <button
                type="button"
                className="button button-primary"
                onClick={() => void executeSwap()}
                disabled={["signing", "sending", "confirming"].includes(swapStatus.kind)}
              >
                {swapStatus.kind === "idle"
                  ? "Execute swap"
                  : swapStatus.kind === "signing"
                    ? "Waiting for signature…"
                    : swapStatus.kind === "sending"
                      ? "Building route…"
                      : swapStatus.kind === "confirming"
                      ? "Confirming…"
                      : swapStatus.kind === "unconfirmed"
                        ? "In flight"
                        : "Swapped"}
              </button>
            )}
          </div>
          {swapStatus.kind !== "idle" ? <SwapStatusLine swapStatus={swapStatus} /> : null}
        </div>
      ) : null}
      <p className="hint muted">
        Cookiebox builds the unsigned route, ships the signed bytes to the official
        aggregator, and this app confirms the result on Cookie Chain. No private key
        is ever exposed.
      </p>
    </section>
  );
}

function SwapStatusLine({ swapStatus }: { swapStatus: SwapStatus }) {
  if (swapStatus.kind === "error" || swapStatus.kind === "unconfirmed") {
    return (
      <div className={`status-box ${swapStatus.kind === "unconfirmed" ? "status-warn" : "status-error"}`}>
        <strong>{swapStatus.kind === "unconfirmed" ? "Swap is in flight" : "Swap failed"}</strong>
        <p>{swapStatus.message}</p>
        {swapStatus.kind === "unconfirmed" ? (
          <a className="link" href={explorerTx(swapStatus.signature)} target="_blank" rel="noreferrer">
            Check {shortAddress(swapStatus.signature)} in Cookiescan ↗
          </a>
        ) : null}
      </div>
    );
  }
  return (
    <div className="status-box status-ok">
      <strong>
        {swapStatus.kind === "confirmed"
          ? "Swap confirmed on Cookie Chain."
          : swapStatus.kind === "signing"
            ? "Waiting for your Nightly signature…"
            : swapStatus.kind === "sending"
              ? "Sending the signed route…"
              : "Confirming the swap…"}
      </strong>
      {swapStatus.kind === "confirmed" ? (
        <a className="link" href={explorerTx(swapStatus.signature)} target="_blank" rel="noreferrer">
          View {shortAddress(swapStatus.signature)} in Cookiescan ↗
        </a>
      ) : null}
    </div>
  );
}
