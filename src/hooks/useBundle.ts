import { useEffect, useMemo, useRef, useState } from 'react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import type { ActiveMemeCoin, BundleWallet, PumpProgress } from '../types';
import {
  connectionFor,
  createWallet,
  getSolBalance,
  getTokenBalanceUi,
  getTokenDecimals,
  isDeprecatedRpc,
  keypairFromSecret,
  DEFAULT_RPC,
} from '../utils/solana';
import {
  buyTokenTx,
  buyPumpTokenTx,
  fundWalletTxWallet,
  sellTokenTx,
  sellPumpTokenTx,
  sweepWalletTx,
  sweepWalletPumpTx,
  FEE_BPS,
  RENT_BUFFER_SOL,
} from '../utils/operations';
import { getTokenPriceInSol } from '../utils/jupiter';
import {
  buyPumpCoinWithWallet,
  createMemeCoin,
  getPumpTokenPriceInSol,
  logFullError,
  type SigningWallet,
} from '../utils/pumpfun';
import { loadState, saveState, clearState } from '../utils/storage';
import { useToast } from '../components/Toast';
import { sleep } from '../utils/format';

const AUTO_REFRESH_MS = 20000;
const PUMP_QUEUE_DELAY_MS = 2000;

export function useBundle() {
  const toast = useToast();
  const { publicKey, connected, signTransaction, signAllTransactions } = useWallet();
  const persisted = useMemo(() => loadState(), []);

  const masterPub = publicKey?.toBase58() ?? '';
  const signingWallet = useMemo<SigningWallet | null>(
    () =>
      publicKey && signTransaction && signAllTransactions
        ? { publicKey, signTransaction, signAllTransactions }
        : null,
    [publicKey, signTransaction, signAllTransactions],
  );

  const persistedRpcUrl = persisted?.rpcUrl as string | undefined;
  const [rpcUrl, setRpcUrl] = useState<string>(
    persistedRpcUrl && !isDeprecatedRpc(persistedRpcUrl) ? persistedRpcUrl : DEFAULT_RPC,
  );
  const [tokenMint, setTokenMint] = useState<string>(persisted?.tokenMint ?? '');
  const [solPerWallet, setSolPerWallet] = useState<number>(persisted?.solPerWallet ?? 0.05);
  const [priorityFee, setPriorityFee] = useState<number>(persisted?.priorityFee ?? 0);
  const [autoBuy, setAutoBuy] = useState<boolean>(persisted?.autoBuy ?? true);
  const [walletCount, setWalletCount] = useState<number>(persisted?.walletCount ?? 5);
  const [withdrawAddr, setWithdrawAddr] = useState<string>(persisted?.withdrawAddr ?? '');
  const [wallets, setWallets] = useState<BundleWallet[]>(persisted?.wallets ?? []);
  const [activeMemeCoin, setActiveMemeCoin] = useState<ActiveMemeCoin | null>(
    persisted?.activeMemeCoin ?? null,
  );
  const [busy, setBusy] = useState<boolean>(false);
  const [sellAllProgress, setSellAllProgress] = useState<{
    current: number;
    total: number;
    label: string;
  } | null>(null);
  const [pumpProgress, setPumpProgress] = useState<PumpProgress | null>(null);
  const [price, setPrice] = useState<number>(0);
  const [masterSolBalance, setMasterSolBalance] = useState<number>(0);

  const connection = useMemo(() => connectionFor(rpcUrl), [rpcUrl]);
  const decCache = useRef<{ mint: string; dec: number }>({ mint: '', dec: 9 });
  const priceCache = useRef<{ mint: string; price: number; at: number }>({
    mint: '',
    price: 0,
    at: 0,
  });

  useEffect(() => {
    saveState({
      rpcUrl,
      tokenMint,
      solPerWallet,
      priorityFee,
      autoBuy,
      walletCount,
      withdrawAddr,
      wallets,
      activeMemeCoin,
    });
  }, [
    rpcUrl,
    tokenMint,
    solPerWallet,
    priorityFee,
    autoBuy,
    walletCount,
    withdrawAddr,
    wallets,
    activeMemeCoin,
  ]);

  const isActivePumpCoin = (mint?: string) =>
    !!activeMemeCoin && !!mint && mint === activeMemeCoin.mintAddress;

  const updateWallet = (id: string, patch: Partial<BundleWallet>) => {
    setWallets((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  };

  const feeLamports = () =>
    priorityFee > 0 ? Math.round(priorityFee * LAMPORTS_PER_SOL) : undefined;

  const getDecimals = async (mint: string) => {
    if (!mint) return 9;
    if (decCache.current.mint === mint) return decCache.current.dec;
    const dec = await getTokenDecimals(connection, mint);
    decCache.current = { mint, dec };
    return dec;
  };

  const fetchPrice = async (mint: string) => {
    if (!mint) return 0;
    const now = Date.now();
    if (priceCache.current.mint === mint && now - priceCache.current.at < 15000) {
      return priceCache.current.price;
    }
    const p = await getTokenPriceInSol(mint);
    if (p > 0) {
      priceCache.current = { mint, price: p, at: now };
      setPrice(p);
      return p;
    }
    return priceCache.current.mint === mint ? priceCache.current.price : 0;
  };

  const refreshMasterBalance = async () => {
    if (!masterPub) {
      setMasterSolBalance(0);
      return;
    }
    const bal = await getSolBalance(connection, masterPub);
    setMasterSolBalance(bal);
  };

  useEffect(() => {
    void refreshMasterBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masterPub, connection]);

  const refreshWallet = async (w: BundleWallet, mintOverride?: string) => {
    const mint = mintOverride ?? tokenMint;
    const sol = await getSolBalance(connection, w.publicKey);
    const dec = await getDecimals(mint);
    const tb = await getTokenBalanceUi(connection, w.publicKey, mint);
    const p = isActivePumpCoin(mint)
      ? await getPumpTokenPriceInSol(connection, mint)
      : await fetchPrice(mint);
    const tokenValue = tb * p;
    const holdings = w.returnedToMaster + sol + tokenValue;
    const pnlSol = holdings - w.initialInvested;
    const pnlPct = w.initialInvested > 0 ? (pnlSol / w.initialInvested) * 100 : 0;
    const history = [...w.history, { t: Date.now(), pnlSol, price: p }].slice(-60);
    updateWallet(w.id, {
      solBalance: sol,
      tokenBalance: tb,
      tokenDecimals: dec,
      pnlSol,
      pnlPct,
      history,
    });
  };

  const refreshAll = async (mintOverride?: string) => {
    await refreshMasterBalance();
    for (const w of wallets) {
      await refreshWallet(w, mintOverride);
      await sleep(150);
    }
  };

  const pumpBuyWallet = async (
    w: BundleWallet,
    mint: string,
    label?: string,
    solLamports?: number,
  ) => {
    updateWallet(w.id, { buyStatus: 'pending', lastError: null });
    const t0 = Date.now();
    console.log(
      `[bundle:step] pumpBuyWallet entered wallet=${w.index} addr=${w.publicKey} mint=${mint} solLamports=${solLamports ?? 'auto'}`,
    );
    try {
      const kp = keypairFromSecret(w.secretKey);
      const bal = await connection.getBalance(kp.publicKey);
      const spend = solLamports ?? Math.max(0, bal - Math.floor(RENT_BUFFER_SOL * LAMPORTS_PER_SOL));
      if (spend <= 0) throw new Error('Insufficient SOL balance to buy');
      const res = await buyPumpTokenTx(connection, kp, mint, spend, feeLamports());
      updateWallet(w.id, { buyStatus: 'success', buyTx: res.sig, averageBuyPrice: res.avgPrice });
      console.log(
        `[bundle:step] pumpBuyWallet DONE wallet=${w.index} sig=${res.sig} avgPrice=${res.avgPrice} (elapsed ${Date.now() - t0}ms)`,
      );
      toast.push('success', `Wallet ${w.index} bought ${label ?? 'coin'} ✅`);
    } catch (e) {
      console.error(
        `[bundle:error] pumpBuyWallet FAILED wallet=${w.index} addr=${w.publicKey} mint=${mint} (elapsed ${Date.now() - t0}ms)`,
      );
      logFullError('pumpBuyWallet', 'buyPumpTokenTx', `bundle buy wallet ${w.index}`, e);
      updateWallet(w.id, { buyStatus: 'failed', lastError: (e as Error)?.message ?? String(e) });
      toast.push('error', `Wallet ${w.index}: ${(e as Error)?.message ?? String(e)}`);
    }
  };

  const fundAndBuyOne = async (w: BundleWallet) => {
    updateWallet(w.id, { buyStatus: 'pending', lastError: null });
    try {
      if (!signingWallet) throw new Error('Connect a wallet to fund bundle wallets');
      const sig = await fundWalletTxWallet(
        connection,
        signingWallet,
        w.publicKey,
        solPerWallet,
        feeLamports(),
      );
      updateWallet(w.id, { funded: true, fundedTx: sig, initialInvested: solPerWallet });
      toast.push('success', `Wallet ${w.index} funded (+${solPerWallet} SOL)`);
      if (autoBuy && tokenMint) {
        if (isActivePumpCoin(tokenMint)) {
          await pumpBuyWallet(w, tokenMint, activeMemeCoin?.ticker);
        } else {
          const kp = keypairFromSecret(w.secretKey);
          const dec = await getDecimals(tokenMint);
          const res = await buyTokenTx(connection, kp, tokenMint, dec, feeLamports());
          updateWallet(w.id, { buyStatus: 'success', buyTx: res.sig, averageBuyPrice: res.avgPrice });
          toast.push('success', `Wallet ${w.index} bought token ✅`);
        }
      } else {
        updateWallet(w.id, { buyStatus: 'success' });
      }
      await refreshWallet(w);
    } catch (e) {
      updateWallet(w.id, { buyStatus: 'failed', lastError: (e as Error)?.message ?? String(e) });
      toast.push('error', `Wallet ${w.index}: ${(e as Error)?.message ?? String(e)}`);
    }
  };

  const createWallets = async () => {
    if (!connected || !signingWallet) {
      toast.push('error', 'Connect a wallet first');
      return;
    }
    if (tokenMint && tokenMint.length !== 44) {
      toast.push('error', 'Token Mint Address must be a valid 44-char public key');
      return;
    }
    const n = Math.max(1, Math.min(30, walletCount));
    const base = wallets.length;
    const created = Array.from({ length: n }, (_, i) => createWallet(base + i));
    setWallets((prev) => [...prev, ...created]);
    toast.push('info', `Created ${n} bundle wallets`);
    setBusy(true);
    try {
      for (const w of created) {
        await fundAndBuyOne(w);
        await sleep(300);
      }
    } finally {
      setBusy(false);
    }
  };

  const addWallet = async () => {
    if (!connected || !signingWallet) {
      toast.push('error', 'Connect a wallet first');
      return;
    }
    const w = createWallet(wallets.length);
    setWallets((prev) => [...prev, w]);
    toast.push('info', `Added wallet #${w.index} to bundle`);
    setBusy(true);
    try {
      await fundAndBuyOne(w);
    } finally {
      setBusy(false);
    }
  };

  const buyBundle = async () => {
    if (!tokenMint) {
      toast.push('error', 'Set a Token Mint Address first');
      return;
    }
    const targets = wallets.filter((w) => w.funded);
    if (!targets.length) {
      toast.push('info', 'No funded wallets to buy with');
      return;
    }
    const isPump = isActivePumpCoin(tokenMint);
    setBusy(true);
    try {
      for (const w of targets) {
        if (isPump) {
          await pumpBuyWallet(w, tokenMint, activeMemeCoin?.ticker);
        } else {
          updateWallet(w.id, { buyStatus: 'pending', lastError: null });
          try {
            const kp = keypairFromSecret(w.secretKey);
            const dec = await getDecimals(tokenMint);
            const res = await buyTokenTx(connection, kp, tokenMint, dec, feeLamports());
            updateWallet(w.id, { buyStatus: 'success', buyTx: res.sig, averageBuyPrice: res.avgPrice });
            toast.push('success', `Wallet ${w.index} bought ✅`);
          } catch (e) {
            updateWallet(w.id, { buyStatus: 'failed', lastError: (e as Error)?.message ?? String(e) });
            toast.push('error', `Wallet ${w.index}: ${(e as Error)?.message ?? String(e)}`);
          }
        }
        await refreshWallet(w);
        await sleep(300);
      }
    } finally {
      setBusy(false);
    }
  };

  const sellWallet = async (w: BundleWallet) => {
    if (!tokenMint || !masterPub) {
      toast.push('error', 'Token mint and master address required');
      return;
    }
    updateWallet(w.id, { sellStatus: 'pending', lastError: null });
    try {
      const kp = keypairFromSecret(w.secretKey);
      const res = isActivePumpCoin(tokenMint)
        ? await sellPumpTokenTx(connection, kp, tokenMint, masterPub, FEE_BPS, feeLamports())
        : await sellTokenTx(
            connection,
            kp,
            tokenMint,
            await getDecimals(tokenMint),
            masterPub,
            FEE_BPS,
            feeLamports(),
          );
      updateWallet(w.id, {
        sellStatus: 'success',
        returnedToMaster: w.returnedToMaster + res.sentToMaster,
      });
      toast.push('success', `Wallet ${w.index} sold; ${res.sentToMaster.toFixed(4)} SOL to master`);
      await refreshWallet(w);
    } catch (e) {
      updateWallet(w.id, { sellStatus: 'failed', lastError: (e as Error)?.message ?? String(e) });
      toast.push('error', `Wallet ${w.index} sell failed: ${(e as Error)?.message ?? String(e)}`);
    }
  };

  const sellAll = async () => {
    const targets = wallets.filter((w) => w.tokenBalance > 0 || w.buyStatus === 'success');
    if (!targets.length) {
      toast.push('info', 'No wallets with token balance to sell');
      return;
    }
    setSellAllProgress({ current: 0, total: targets.length, label: 'Selling bundle wallets' });
    setBusy(true);
    try {
      for (let i = 0; i < targets.length; i++) {
        setSellAllProgress({
          current: i + 1,
          total: targets.length,
          label: `Selling wallet ${i + 1} / ${targets.length}`,
        });
        await sellWallet(targets[i]);
        await sleep(300);
      }
    } finally {
      setSellAllProgress(null);
      setBusy(false);
    }
  };

  const launchMemeCoin = async (
    name: string,
    ticker: string,
    description: string,
    imageUrl: string,
    initialBuySol: number,
  ) => {
    const cleanName = name.trim();
    const cleanTicker = ticker.trim().toUpperCase().slice(0, 10);
    if (!signingWallet) {
      toast.push('error', 'Connect a wallet to launch');
      return;
    }
    if (!cleanName) {
      toast.push('error', 'Coin Name is required');
      return;
    }
    if (!cleanTicker) {
      toast.push('error', 'Coin Ticker is required (max 10 chars)');
      return;
    }
    if (!(initialBuySol > 0)) {
      toast.push('error', 'Initial Buy Amount must be greater than 0 SOL');
      return;
    }
    const targets = wallets.filter((w) => w.funded);
    setBusy(true);
    const launchT0 = Date.now();
    try {
      setPumpProgress({ label: 'Creating coin...', current: 0, total: targets.length });
      const created = await createMemeCoin(
        connection,
        signingWallet,
        {
          name: cleanName,
          symbol: cleanTicker,
          description: description.trim(),
          imageUrl: imageUrl.trim(),
        },
        feeLamports(),
      );
      toast.push('success', `Coin ${cleanName} (${cleanTicker}) created: ${created.mint}`);

      setPumpProgress({ label: 'Master buying...', current: 0, total: 1 });
      const masterBuyLamports = Math.floor(initialBuySol * LAMPORTS_PER_SOL);
      await buyPumpCoinWithWallet(
        connection,
        signingWallet,
        created.mint,
        masterBuyLamports,
        feeLamports(),
      );
      toast.push('success', `Master bought ${initialBuySol} SOL of ${cleanTicker}`);

      const coin: ActiveMemeCoin = {
        mintAddress: created.mint,
        name: cleanName,
        ticker: cleanTicker,
        image: imageUrl.trim(),
      };
      setActiveMemeCoin(coin);
      setTokenMint(created.mint);

      console.log(
        `[bundle:step] STEP 11 bundle buy started mint=${created.mint} wallets=${targets.length} (elapsed ${Date.now() - launchT0}ms)`,
      );
      for (let i = 0; i < targets.length; i++) {
        setPumpProgress({
          label: `Buying for wallet ${i + 1}/${targets.length}...`,
          current: i + 1,
          total: targets.length,
        });
        await pumpBuyWallet(targets[i], created.mint, cleanTicker);
        await refreshWallet(targets[i], created.mint);
        await sleep(PUMP_QUEUE_DELAY_MS);
      }
      console.log(
        `[bundle:step] STEP 12 bundle buy finished mint=${created.mint} wallets=${targets.length} (elapsed ${Date.now() - launchT0}ms)`,
      );
      if (targets.length) {
        toast.push('success', `Bundle buy complete for ${targets.length} wallets`);
      } else {
        toast.push('info', 'No funded wallets to buy the new coin (create or fund wallets first)');
      }

      setPumpProgress(null);
      await refreshAll(created.mint);
    } catch (e) {
      setPumpProgress(null);
      console.error(
        `[bundle:error] launchMemeCoin FAILED (elapsed ${Date.now() - launchT0}ms)`,
      );
      logFullError('launchMemeCoin', 'launchMemeCoin', 'coin creation / master buy / bundle buy', e);
      const msg = (e as Error)?.message ?? String(e);
      toast.push('error', `Pump.fun launch failed: ${msg}`);
    } finally {
      setBusy(false);
    }
  };

  const deleteWallet = async (id: string, sellFirst: boolean) => {
    const w = wallets.find((x) => x.id === id);
    if (!w) return;
    setBusy(true);
    try {
      if (sellFirst && masterPub) {
        const kp = keypairFromSecret(w.secretKey);
        if (tokenMint && w.tokenBalance > 0) {
          const isPump = isActivePumpCoin(tokenMint);
          if (isPump) {
            await sellPumpTokenTx(connection, kp, tokenMint, masterPub, FEE_BPS, feeLamports());
          } else {
            await sellTokenTx(
              connection,
              kp,
              tokenMint,
              await getDecimals(tokenMint),
              masterPub,
              FEE_BPS,
              feeLamports(),
            );
          }
          toast.push('success', `Wallet ${w.index} sold tokens before deleting`);
        } else {
          await sweepWalletTx(connection, kp, '', masterPub, feeLamports());
        }
      }
      setWallets((prev) => prev.filter((x) => x.id !== id));
      toast.push('success', `Wallet ${w.index} deleted`);
    } catch (e) {
      toast.push('error', `Delete wallet ${w.index} failed: ${(e as Error)?.message ?? String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const emergencySweep = async () => {
    const dest = withdrawAddr || masterPub;
    if (!dest) {
      toast.push('error', 'Connect a wallet (or set a withdrawal address) first');
      return;
    }
    setSellAllProgress({ current: 0, total: wallets.length, label: 'Emergency sweep' });
    setBusy(true);
    try {
      const isPump = isActivePumpCoin(tokenMint);
      for (let i = 0; i < wallets.length; i++) {
        const w = wallets[i];
        setSellAllProgress({
          current: i + 1,
          total: wallets.length,
          label: `Sweeping wallet ${i + 1} / ${wallets.length}`,
        });
        try {
          const kp = keypairFromSecret(w.secretKey);
          if (isPump) {
            await sweepWalletPumpTx(connection, kp, tokenMint, dest, feeLamports());
          } else {
            await sweepWalletTx(connection, kp, tokenMint, dest, feeLamports());
          }
          toast.push('success', `Swept wallet ${w.index}`);
        } catch (e) {
          toast.push('error', `Sweep wallet ${w.index} failed: ${(e as Error)?.message ?? String(e)}`);
        }
        await sleep(300);
      }
      toast.push('success', `Emergency sweep complete → ${dest}`);
      await refreshAll();
    } finally {
      setSellAllProgress(null);
      setBusy(false);
    }
  };

  const reset = () => {
    clearState();
    setTokenMint('');
    setWithdrawAddr('');
    setWallets([]);
    setActiveMemeCoin(null);
    setPumpProgress(null);
    setPrice(0);
    setMasterSolBalance(0);
    decCache.current = { mint: '', dec: 9 };
    priceCache.current = { mint: '', price: 0, at: 0 };
    toast.push('info', 'All bundle data cleared');
  };

  useEffect(() => {
    if (!wallets.length || busy || sellAllProgress) return;
    const id = setInterval(() => {
      void refreshAll();
    }, AUTO_REFRESH_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallets.length, busy, sellAllProgress, tokenMint, activeMemeCoin]);

  return {
    masterPub,
    masterSolBalance,
    connection,
    rpcUrl,
    tokenMint,
    solPerWallet,
    priorityFee,
    autoBuy,
    walletCount,
    withdrawAddr,
    wallets,
    activeMemeCoin,
    busy,
    sellAllProgress,
    pumpProgress,
    price,
    setRpcUrl,
    setTokenMint,
    setSolPerWallet,
    setPriorityFee,
    setAutoBuy,
    setWalletCount,
    setWithdrawAddr,
    createWallets,
    addWallet,
    deleteWallet,
    buyBundle,
    sellWallet,
    sellAll,
    launchMemeCoin,
    emergencySweep,
    refreshAll,
    reset,
  };
}

export type BundleApi = ReturnType<typeof useBundle>;
