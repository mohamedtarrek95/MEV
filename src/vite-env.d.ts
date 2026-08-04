/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SOLANA_RPC_URL?: string;
  readonly VITE_TWITTER_BEARER_TOKEN?: string;
  readonly VITE_DEXSCREENER_API_KEY?: string;
  readonly VITE_COINGECKO_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
