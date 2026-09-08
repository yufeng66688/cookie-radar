import { Connection, PublicKey } from "@solana/web3.js";

export const COOKIE_RPC =
  import.meta.env.VITE_COOKIE_RPC ?? "https://rpc.cookiescan.io";
export const COOKIE_DAS =
  import.meta.env.VITE_COOKIE_DAS ?? "https://api.cookiescan.io";
export const COOKIE_MARKETS =
  import.meta.env.VITE_COOKIE_MARKETS ?? "https://api.cookiescan.io/api/markets";
export const COOKIE_PRICE =
  import.meta.env.VITE_COOKIE_PRICE ?? "https://api.cookiescan.io/api/price/cook";
export const COOKIEBOX_QUOTE =
  import.meta.env.VITE_COOKIEBOX_QUOTE ?? "https://agg.cookiebox.app/quote";
export const COOKIEBOX_SWAP_TX =
  import.meta.env.VITE_COOKIEBOX_SWAP_TX ?? "https://agg.cookiebox.app/swap-tx";

export const COOKIE_GENESIS_HASH = "9wDaBRDgArEUpvhHxGguNkwozsZh4UpGZB9o2EoEcBB2";
export const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
export const COOKIE_SYMBOL = "COOK";
export const BRIDGE_URL = "https://bridge.cookiescan.io";
export const EXPLORER_URL = "https://cookiescan.io";
export const DOCS_URL = "https://docs.cookiechain.wtf";
export const NIGHTLY_URL = "https://nightly.app";
export const COOKIEBOX_URL = "https://cookiebox.app";
export const COOKIESWAP_URL = "https://cookieswap.fun";
export const COOKOVEN_URL = "https://book.cookoven.xyz";

export const connection = new Connection(COOKIE_RPC, {
  commitment: "confirmed",
  confirmTransactionInitialTimeout: 90_000,
});

export interface CrumbsResponse {
  signature: string;
  memo?: string | null;
  slot: number;
  blockTime: number | null;
  err: unknown | null;
  confirmationStatus: "processed" | "confirmed" | "finalized";
}

export interface CrumbEvent {
  id: string;
  signature: string;
  message: string;
  slot: number;
  blockTime: number | null;
  error: boolean;
  status: string;
}

export interface ChainInfo {
  healthy: boolean;
  health: string;
  version: string;
  epoch: number;
  slot: number;
  blockHeight: number;
  slotsInEpoch: number;
  slotIndex: number;
  transactionCount: number;
  epochProgress: number;
  slotsPerSec: number | null;
  tps: number | null;
  validators: number;
  delinquent: number;
  genesisHash: string;
}

export interface MarketPool {
  id: string;
  venue: string;
  symbol: string;
  liquidity: number;
  count: number;
}

export interface MarketSnapshot {
  cookUsd: number | null;
  count: number;
  pools: MarketPool[];
}

export interface WalletAsset {
  id: string;
  name: string;
  symbol: string;
  image: string | null;
  balance: number | null;
  decimals: number;
  priceUsd: number | null;
  type: string;
}

type RpcResult<T> = { result?: T; error?: { message?: string; code?: number } };

async function rpc<T>(
  method: string,
  params: unknown = [],
  endpoint = COOKIE_RPC,
): Promise<T> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
  });
  const body = (await response.json()) as RpcResult<T>;
  if (body.error) {
    throw new Error(body.error.message ?? `${method} failed`);
  }
  if (body.result == null) {
    throw new Error(`${method} returned an empty result`);
  }
  return body.result;
}

export async function fetchChainInfo(): Promise<ChainInfo> {
  const [health, version, epoch, perf, votes, genesisHash] = await Promise.all([
    rpc<string>("getHealth"),
    rpc<{ "solana-core": string }>("getVersion"),
    rpc<{
      absoluteSlot: number;
      blockHeight: number;
      epoch: number;
      slotIndex: number;
      slotsInEpoch: number;
      transactionCount: number;
    }>("getEpochInfo"),
    rpc<
      Array<{
        numSlots: number;
        numTransactions: number;
        samplePeriodSecs: number;
      }>
    >("getRecentPerformanceSamples", [5]),
    rpc<{ current?: unknown[]; delinquent?: unknown[] }>("getVoteAccounts", [
      { commitment: "confirmed" },
    ]),
    rpc<string>("getGenesisHash"),
  ]);

  const sample = perf[0];
  return {
    healthy: health === "ok",
    health,
    version: version["solana-core"],
    epoch: epoch.epoch,
    slot: epoch.absoluteSlot,
    blockHeight: epoch.blockHeight,
    slotsInEpoch: epoch.slotsInEpoch,
    slotIndex: epoch.slotIndex,
    transactionCount: epoch.transactionCount,
    epochProgress: epoch.slotsInEpoch
      ? Math.round((epoch.slotIndex / epoch.slotsInEpoch) * 100)
      : 0,
    slotsPerSec: sample?.samplePeriodSecs
      ? Math.round((sample.numSlots / sample.samplePeriodSecs) * 100) / 100
      : null,
    tps: sample?.samplePeriodSecs
      ? Math.round((sample.numTransactions / sample.samplePeriodSecs) * 10) / 10
      : null,
    validators: votes.current?.length ?? 0,
    delinquent: votes.delinquent?.length ?? 0,
    genesisHash,
  };
}

export async function fetchCrumbs(limit = 120): Promise<CrumbEvent[]> {
  const rows = await rpc<CrumbsResponse[]>("getSignaturesForAddress", [
    MEMO_PROGRAM_ID,
    { limit },
  ]);
  return (rows ?? []).filter(Boolean).map((row) => ({
    id: row.signature,
    signature: row.signature,
    message: row.memo?.trim() || "(memo)",
    slot: row.slot,
    blockTime: row.blockTime,
    error: Boolean(row.err),
    status: row.confirmationStatus,
  }));
}

export async function fetchMarkets(): Promise<MarketSnapshot> {
  const response = await fetch(COOKIE_MARKETS, { cache: "no-store" });
  const body = (await response.json()) as {
    success?: boolean;
    cookUsd?: number | null;
    marketCount?: number;
    markets?: Array<{
      marketId: string;
      type: string;
      baseToken: { symbol?: string; amount?: number };
      quoteToken: { symbol?: string; amount?: number };
      liquidityUsd?: number;
      liquidityDisplay?: string;
    }>;
  };
  const pools = (body.markets ?? [])
    .filter((pool) => (pool.liquidityUsd ?? 0) > 0)
    .sort((a, b) => (b.liquidityUsd ?? 0) - (a.liquidityUsd ?? 0))
    .slice(0, 10)
    .map((pool) => ({
      id: pool.marketId,
      venue: pool.type,
      symbol: [
        pool.baseToken.symbol ?? "?",
        pool.quoteToken.symbol ?? "?",
      ].join(" / "),
      liquidity: pool.liquidityUsd ?? 0,
      count: 1,
    }));
  return {
    cookUsd: body.cookUsd ?? null,
    count: body.marketCount ?? body.markets?.length ?? 0,
    pools,
  };
}

export async function fetchWalletAssets(owner: PublicKey): Promise<WalletAsset[]> {
  const response = await fetch(COOKIE_DAS, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "getAssetsByOwner",
      params: {
        ownerAddress: owner.toBase58(),
        page: 1,
        limit: 20,
      },
    }),
  });
  const body = (await response.json()) as {
    result?: { items?: Array<Record<string, unknown>> };
    error?: { message?: string };
  };
  if (body.error) throw new Error(body.error.message ?? "DAS lookup failed");
  const items = body.result?.items ?? [];
  return items
    .filter((item) => !Boolean(item.burnt))
    .map((item) => {
      const content = (item.content ?? {}) as Record<string, unknown>;
      const metadata = (content.metadata ?? {}) as Record<string, unknown>;
      const links = (content.links ?? {}) as Record<string, unknown>;
      const info = (item.token_info ?? {}) as Record<string, unknown>;
      const rawBalance = Number(info.balance ?? 0);
      const decimals = Number(info.decimals ?? 0);
      const type = String(item.interface ?? item.token_standard ?? "asset");
      const isNft = type.includes("NFT") || type.includes("NonFungible");
      return {
        id: String(item.id ?? ""),
        name: String(metadata.name ?? "Asset"),
        symbol: String(metadata.symbol ?? ""),
        image: links.image ? String(links.image) : null,
        balance: isNft
          ? null
          : Number.isFinite(rawBalance)
            ? rawBalance / 10 ** Math.max(0, decimals)
            : null,
        decimals,
        priceUsd: Number(info.price_per_token ?? null) || null,
        type,
      };
    })
    .filter(
      (asset) =>
        asset.balance === null ||
        asset.balance > 0 ||
        asset.type.includes("NFT") ||
        asset.type.includes("NonFungible"),
    );
}

export function shortAddress(value: string, size = 4): string {
  if (value.length <= size * 2 + 1) return value;
  return `${value.slice(0, size)}…${value.slice(-size)}`;
}

export function explorerTx(signature: string): string {
  return `${EXPLORER_URL}/tx/${signature}`;
}

export function explorerAccount(address: string): string {
  return `${EXPLORER_URL}/account/${address}`;
}

export function formatNumber(value: number | null | undefined, digits = 0): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 2 })}M`;
  }
  return value.toLocaleString("en-US", { maximumFractionDigits: digits });
}

export function formatUsd(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const digits = value < 0.001 ? 8 : value < 1 ? 6 : 2;
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: Math.min(digits, 6),
    maximumFractionDigits: digits,
  })}`;
}

export function formatTime(timestamp: number | null): string {
  if (!timestamp) return "—";
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(timestamp * 1000));
}

export function formatRelative(timestamp: number | null): string {
  if (!timestamp) return "—";
  const seconds = Math.max(0, Math.floor(Date.now() / 1000 - timestamp));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function isBotMemo(message: string): boolean {
  return /keno:v1|bot|relayer|automation|scheduler/i.test(message);
}

export function extractTags(messages: string[]): string[] {
  const counts = new Map<string, number>();
  for (const message of messages) {
    const matches = message.match(/#[A-Za-z0-9_-]{2,24}/g) ?? [];
    for (const tag of matches) {
      const key = tag.toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([tag]) => tag);
}

export function buildActivityBuckets(
  crumbs: CrumbEvent[],
): Array<{ label: string; count: number }> {
  if (crumbs.length < 2) return [];
  const times = crumbs
    .map((crumb) => crumb.blockTime)
    .filter((value): value is number => value != null);
  if (!times.length) return [];
  const start = Math.min(...times);
  const end = Math.max(...times);
  const span = Math.max(300, end - start + 1);
  const size = Math.ceil(span / 8);
  const buckets = Array.from({ length: 8 }, (_, index) => ({
    label: formatTime(start + index * size).slice(0, 5),
    count: 0,
  }));
  for (const time of times) {
    const index = Math.min(7, Math.floor((time - start) / size));
    buckets[index].count += 1;
  }
  return buckets;
}
