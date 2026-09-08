import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { Buffer } from "buffer";
import { useState } from "react";
import {
  BRIDGE_URL,
  MEMO_PROGRAM_ID,
  connection,
  explorerTx,
  shortAddress,
} from "../lib/cookie";

type Status =
  | { kind: "idle" }
  | { kind: "signing" }
  | { kind: "sending" }
  | { kind: "confirming"; signature: string }
  | { kind: "confirmed"; signature: string }
  | { kind: "error"; message: string }
  | { kind: "unconfirmed"; message: string; signature: string };

export function CrumbComposer({ onSent }: { onSent: () => void }) {
  const { publicKey, connected, sendTransaction } = useWallet();
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function post() {
    if (!connected || !publicKey) return;
    const message = text.trim();
    if (!message) return;
    setStatus({ kind: "signing" });
    let signature = "";
    try {
      const instruction = new TransactionInstruction({
        keys: [{ pubkey: publicKey, isSigner: true, isWritable: false }],
        programId: new PublicKey(MEMO_PROGRAM_ID),
        data: Buffer.from(message, "utf8"),
      });
      const transaction = new Transaction().add(instruction);
      setStatus({ kind: "sending" });
      signature = await sendTransaction(transaction, connection, {
        skipPreflight: false,
        maxRetries: 3,
      });
      setStatus({ kind: "confirming", signature });
      await connection.confirmTransaction(signature, "confirmed");
      setStatus({ kind: "confirmed", signature });
      setText("");
      onSent();
    } catch (error) {
      const raw = error instanceof Error ? error.message : String(error);
      const kind =
        signature && /blockheight|expired|timeout|not found/i.test(raw)
          ? "unconfirmed"
          : "error";
      const message = friendlyError(raw);
      setStatus(kind === "unconfirmed" ? { kind, message, signature } : { kind, message });
    }
  }

  function friendlyError(raw: string): string {
    if (/reject|cancel|declined/i.test(raw)) {
      return "You rejected the signature. No transaction was sent.";
    }
    if (/insufficient|no record of a prior credit|0x1/i.test(raw)) {
      return "Not enough COOK to pay the network fee. Bridge a little COOK first.";
    }
    if (/blockhash|genesis|network|Cluster/i.test(raw)) {
      return "Your wallet may be on the wrong network. Use Connect Nightly to switch to Cookie Chain.";
    }
    return raw;
  }

  const busy = ["signing", "sending", "confirming"].includes(status.kind);

  return (
    <section className="card composer-card">
      <div className="card-heading">
        <div>
          <h2>Drop a crumb</h2>
          <p className="muted">One tiny signed memo is written straight to Cookie Chain.</p>
        </div>
        <span className="brand-mark">🍪</span>
      </div>

      <label htmlFor="crumb" className="sr-only">Write a crumb</label>
      <textarea
        id="crumb"
        value={text}
        onChange={(event) => setText(event.target.value.slice(0, 240))}
        placeholder="What’s cooking on Cookie Chain?"
        rows={4}
        maxLength={240}
      />
      <div className="composer-tools">
        <span className="counter">{text.length}/240</span>
        <button
          type="button"
          className="button button-primary"
          onClick={() => void post()}
          disabled={!connected || !publicKey || !text.trim() || busy}
        >
          {busy ? "Sending…" : "Post crumb"}
        </button>
      </div>
      <p className="hint muted">
        Fees are tiny COOK. Need funds? Use the{" "}
        <a href={BRIDGE_URL} target="_blank" rel="noreferrer">
          official Cookie Chain bridge
        </a>
        .
      </p>

      {status.kind !== "idle" ? <StatusLine status={status} /> : null}
    </section>
  );
}

function StatusLine({ status }: { status: Status }) {
  const steps: Array<{ label: string; active: boolean; done: boolean }> = [
    { label: "Sign", active: status.kind === "signing", done: ["sending", "confirming", "confirmed"].includes(status.kind) },
    { label: "Send", active: status.kind === "sending", done: ["confirming", "confirmed"].includes(status.kind) },
    { label: "Confirm", active: status.kind === "confirming", done: status.kind === "confirmed" },
  ];
  return (
    <div className="tx-status">
      {status.kind === "error" || status.kind === "unconfirmed" ? (
        <div className={`status-box ${status.kind === "unconfirmed" ? "status-warn" : "status-error"}`}>
          <strong>{status.kind === "unconfirmed" ? "Still in flight" : "Transaction failed"}</strong>
          <p>{status.message}</p>
          {status.kind === "unconfirmed" ? (
            <a className="link" href={explorerTx(status.signature)} target="_blank" rel="noreferrer">
              Check {shortAddress(status.signature)} in Cookiescan ↗
            </a>
          ) : null}
        </div>
      ) : (
        <ol className="step-list">
          {steps.map((step) => (
            <li key={step.label} className={step.done ? "done" : step.active ? "active" : ""}>
              <span>{step.done ? "✓" : step.active ? "●" : "○"}</span>
              {step.label}
            </li>
          ))}
        </ol>
      )}
      {status.kind === "confirmed" ? (
        <div className="status-box status-ok">
          <strong>Confirmed on Cookie Chain.</strong>
          <a className="link" href={explorerTx(status.signature)} target="_blank" rel="noreferrer">
            View {shortAddress(status.signature)} in Cookiescan ↗
          </a>
        </div>
      ) : null}
    </div>
  );
}
