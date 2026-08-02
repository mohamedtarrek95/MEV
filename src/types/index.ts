export type WalletStatus = 'idle' | 'pending' | 'success' | 'failed';

export interface PnlSnapshot {
  t: number;
  pnlSol: number;
  price: number;
}

export interface BundleWallet {
  id: string;
  index: number;
  publicKey: string;
  secretKey: string;
  createdAt: number;
  funded: boolean;
  initialInvested: number;
  fundedTx: string | null;
  buyStatus: WalletStatus;
  buyTx: string | null;
  sellStatus: WalletStatus;
  solBalance: number;
  tokenBalance: number;
  tokenDecimals: number;
  averageBuyPrice: number;
  pnlSol: number;
  pnlPct: number;
  returnedToMaster: number;
  lastError: string | null;
  history: PnlSnapshot[];
}

export interface SellProgress {
  current: number;
  total: number;
  label: string;
}
