import { NightlyWalletAdapter } from "@solana/wallet-adapter-nightly";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { useMemo, type ReactNode } from "react";
import { COOKIE_RPC } from "./lib/cookie";

import "@solana/wallet-adapter-react-ui/styles.css";

export function Providers({ children }: { children: ReactNode }) {
  const wallets = useMemo(() => [new NightlyWalletAdapter()], []);
  return (
    <ConnectionProvider endpoint={COOKIE_RPC}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
