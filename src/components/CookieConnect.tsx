import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useEffect, useState } from "react";
import { BRIDGE_URL, NIGHTLY_URL } from "../lib/cookie";
import {
  activeGenesisHash,
  getNightlySolana,
  switchNightlyToCookie,
} from "../lib/nightly";

export function CookieConnect({
  onConnected,
}: {
  onConnected: () => void;
}) {
  const { connect, connected } = useWallet();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [nightly, setNightly] = useState<{ detected: boolean; genesis: string | null }>({
    detected: false,
    genesis: null,
  });

  useEffect(() => {
    function detect() {
      setNightly({
        detected: Boolean(getNightlySolana()),
        genesis: activeGenesisHash(),
      });
    }
    detect();
    const interval = window.setInterval(detect, 1_000);
    return () => window.clearInterval(interval);
  }, []);

  async function connectCookie() {
    setBusy(true);
    setMessage(null);
    try {
      if (!getNightlySolana()) {
        setMessage("Nightly wasn’t detected in this browser. Install it, then reload.");
        return;
      }
      const switched = await switchNightlyToCookie();
      if (!switched) {
        setMessage("Open Nightly → Settings → Networks and choose Cookie Chain.");
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 350));
      if (!connected) await connect();
      setMessage("Connected to Cookie Chain.");
      onConnected();
    } catch (error) {
      const raw = error instanceof Error ? error.message : String(error);
      if (/reject|cancel/i.test(raw)) {
        setMessage("You cancelled the network change.");
      } else if (/not found|cannot|unable|unsupported/i.test(raw)) {
        setMessage("Nightly couldn’t switch. Install Nightly or add Cookie Chain manually in Settings.");
      } else {
        setMessage(raw);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="connect-stack">
      <div className="connect-row">
        <button
          type="button"
          className="button button-primary"
          onClick={() => void connectCookie()}
          disabled={busy}
        >
          {busy ? "Switching…" : "Connect Nightly"}
        </button>
        <WalletMultiButton className="wallet-multi" />
      </div>
      <p className="connection-note">
        Nightly is required. The button asks Nightly to switch to Cookie Chain
        automatically using the official genesis hash.
      </p>
      {message ? <p className="inline-note">{message}</p> : null}
      {!nightly.detected ? (
        <p className="inline-note">
          If Nightly is installed and not detected,{" "}
          <a href={NIGHTLY_URL} target="_blank" rel="noreferrer">
            install or re-open it
          </a>
          , or use the{" "}
          <a href={BRIDGE_URL} target="_blank" rel="noreferrer">
            official bridge
          </a>{" "}
          after connecting.
        </p>
      ) : null}
      <small className="muted">
        Active Nightly genesis: {nightly.genesis ?? "not available"}
      </small>
    </div>
  );
}
