import { COOKIE_GENESIS_HASH, COOKIE_RPC } from "./cookie";

type NightlySolana = {
  genesisHash?: string;
  changeNetwork?: (network: { genesisHash: string; url?: string }) => Promise<void>;
};

type NightlyWindow = Window & {
  nightly?: {
    solana?: NightlySolana;
  };
};

export function getNightlySolana(): NightlySolana | null {
  return (window as NightlyWindow).nightly?.solana ?? null;
}

export function activeGenesisHash(): string | null {
  return getNightlySolana()?.genesisHash ?? null;
}

export async function switchNightlyToCookie(): Promise<boolean> {
  const nightly = getNightlySolana();
  if (!nightly?.changeNetwork) return false;
  await nightly.changeNetwork({
    genesisHash: COOKIE_GENESIS_HASH,
    url: COOKIE_RPC,
  });
  return true;
}
