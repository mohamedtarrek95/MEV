import { useState, useEffect, useCallback, useRef } from 'react';
import type { LaunchCoin } from '../utils/launch/types';

interface TokenDraft {
  id: string;
  coinMint: string;
  name: string;
  ticker: string;
  description: string;
  story: string;
  lore: string;
  narrative: string;
  whyViral: string;
  targetAudience: string;
  mascot: string;
  visualStyle: string;
  logoPrompt: string;
  bannerPrompt: string;
  imagePrompt: string;
  negativePrompt: string;
  colorPalette: string;
  website: string;
  twitter: string;
  telegram: string;
  supply: string;
  decimals: string;
  creatorNotes: string;
  savedAt: number;
}

const DRAFTS_KEY = 'token-creator-drafts';

function loadDrafts(): TokenDraft[] {
  try { return JSON.parse(localStorage.getItem(DRAFTS_KEY) || '[]'); } catch { return []; }
}
function saveDrafts(drafts: TokenDraft[]) {
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

function buildDefaults(data: LaunchCoin): Omit<TokenDraft, 'id' | 'savedAt'> {
  const { coin, narrativeCluster, scoreBreakdown, trend } = data;
  const narrName = narrativeCluster?.narrative || coin.name;
  const variantCount = narrativeCluster?.count || 1;
  const desc = `${coin.name} (${coin.ticker}) is a Solana meme coin launched during the ${narrName} narrative wave. ${variantCount > 1 ? `Part of a cluster of ${variantCount} similar launches — this one stands out with a unique angle.` : 'A fresh take on an emerging meme.'} Current market cap: $${coin.marketCap.toFixed(0)}. Liquidity: $${coin.liquidity.toFixed(0)}.`;
  const story = `In the chaotic world of Solana memecoins, ${coin.name} emerged as a response to the ${narrName} trend. ${coin.ageSeconds < 120 ? 'Launched just moments ago' : `About ${Math.round(coin.ageSeconds / 60)} minutes old`}, it's already attracting ${coin.uniqueBuyers} unique buyers. ${coin.buys5m > coin.sells5m ? 'Buy pressure is outpacing sells.' : 'Early traders are positioning.'} The ${narrName} narrative is ${trend === 'rising' ? 'heating up' : trend === 'new' ? 'just beginning' : 'steadily growing'}.`;
  const lore = `The legend of ${coin.name} begins with the ${narrName} movement on Solana. ${variantCount > 4 ? `With ${variantCount} variants already launched, the community is looking for THE definitive ${narrName} token.` : variantCount > 1 ? `Multiple developers see potential in the ${narrName} idea, but ${coin.name} brings something different.` : `Early to the ${narrName} narrative, ${coin.name} has first-mover potential.`}`;
  const whyViral = `${coin.name} rides the ${narrName} narrative which is ${trend === 'rising' ? 'trending upward' : 'gaining traction'}. ${scoreBreakdown.narrativeScore > 50 ? 'High narrative alignment score — this meme idea is being independently created by multiple developers, proving demand.' : 'The narrative is still early — fewer copies means less competition.'} ${scoreBreakdown.buyerGrowth > 60 ? 'Strong buyer growth indicates genuine interest.' : 'Buyer activity is building.'} Target: degens who follow ${narrName} culture.`;
  const targetAudience = `Solana degen traders following the ${narrName} narrative. ${trend === 'rising' ? 'Active traders looking for the next viral meme.' : 'Early adopters positioning before the narrative peaks.'}`;
  const mascot = `A ${narrName.toLowerCase()}-themed character — visually distinct, memeable, instantly recognizable. Think bold colors, expressive face, shareable format.`;
  const visualStyle = `Meme-coin aesthetic: bold, high-contrast, cartoon/comic style. ${trend === 'rising' ? 'Energetic and hype-driven.' : 'Clean and distinctive.'} Optimized for Twitter profile pics and Telegram stickers.`;
  const logoPrompt = `${coin.name} meme coin logo, ${narrName.toLowerCase()} character, bold cartoon style, high contrast, transparent background, token icon, crypto meme aesthetic, vector art`;
  const bannerPrompt = `${coin.name} meme coin banner, ${narrName.toLowerCase()} themed, vibrant colors, crypto community energy, degen trading vibe, wide format, social media banner`;
  const imagePrompt = `${coin.name} meme coin mascot, ${narrName.toLowerCase()} character, expressive cartoon face, bold colors, meme-coin aesthetic, Solana crypto, degen culture, viral meme design, high quality illustration`;
  const negativePrompt = `blurry, low quality, text heavy, complicated design, dark mood, realistic photo, 3d render, watercolor, sketch, draft`;
  const colorPalette = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6,'0')}, #${Math.floor(Math.random()*16777215).toString(16).padStart(6,'0')}, #${Math.floor(Math.random()*16777215).toString(16).padStart(6,'0')}, #${Math.floor(Math.random()*16777215).toString(16).padStart(6,'0')}`;
  const supply = '1000000000';
  const decimals = '9';
  const creatorNotes = `Launch reason: ${narrativeCluster ? `${narrativeCluster.narrative} narrative has ${variantCount} independent launches — proving demand` : 'Fresh meme concept'}. Score: ${data.launchScore}/100. Probability: ${data.probability}. ${data.warnings.length > 0 ? `Warnings: ${data.warnings.map((w) => w.message).join('; ')}` : 'No warnings detected.'}`;

  return {
    coinMint: coin.mint, name: coin.name, ticker: coin.ticker, description: desc,
    story, lore, narrative: `${narrName} Narrative — ${variantCount} launches, ${narrativeCluster?.uniqueCreators.length || 1} unique creators, ${trend} trend`,
    whyViral, targetAudience, mascot, visualStyle, logoPrompt, bannerPrompt,
    imagePrompt, negativePrompt, colorPalette, website: coin.website, twitter: coin.twitter,
    telegram: coin.telegram, supply, decimals, creatorNotes,
  };
}

function copyText(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function buildCopyPackage(d: TokenDraft): string {
  return `========================================
TOKEN CREATION PACKAGE
========================================

TOKEN NAME: ${d.name}
TICKER: $${d.ticker}
SUPPLY: ${d.supply}
DECIMALS: ${d.decimals}

--- DESCRIPTION ---
${d.description}

--- STORY ---
${d.story}

--- LORE ---
${d.lore}

--- NARRATIVE ---
${d.narrative}

--- WHY IT CAN GO VIRAL ---
${d.whyViral}

--- TARGET AUDIENCE ---
${d.targetAudience}

--- MASCOT ---
${d.mascot}

--- VISUAL STYLE ---
${d.visualStyle}

--- IMAGE PROMPT ---
${d.imagePrompt}

--- LOGO PROMPT ---
${d.logoPrompt}

--- BANNER PROMPT ---
${d.bannerPrompt}

--- NEGATIVE PROMPT ---
${d.negativePrompt}

--- COLOR PALETTE ---
${d.colorPalette}

--- LINKS ---
Website: ${d.website || 'none'}
Twitter: ${d.twitter || 'none'}
Telegram: ${d.telegram || 'none'}

--- CREATOR NOTES ---
${d.creatorNotes}
========================================`;
}

function buildMarkdown(d: TokenDraft): string {
  return `# ${d.name} ($${d.ticker}) — Token Creation Plan

## Token Details
- **Name:** ${d.name}
- **Ticker:** $${d.ticker}
- **Supply:** ${d.supply}
- **Decimals:** ${d.decimals}

## Description
${d.description}

## Story
${d.story}

## Lore
${d.lore}

## Narrative
${d.narrative}

## Why It Can Go Viral
${d.whyViral}

## Target Audience
${d.targetAudience}

## Mascot
${d.mascot}

## Visual Style
${d.visualStyle}

## Prompts
- **Image:** ${d.imagePrompt}
- **Logo:** ${d.logoPrompt}
- **Banner:** ${d.bannerPrompt}
- **Negative:** ${d.negativePrompt}

## Color Palette
${d.colorPalette}

## Links
- Website: ${d.website || 'none'}
- Twitter: ${d.twitter || 'none'}
- Telegram: ${d.telegram || 'none'}

## Creator Notes
${d.creatorNotes}`;
}

interface TokenCreatorModalProps {
  open: boolean;
  data: LaunchCoin;
  onClose: () => void;
}

export function TokenCreatorModal({ open, data, onClose }: TokenCreatorModalProps) {
  const defaults = useRef(buildDefaults(data));
  const [d, setD] = useState<TokenDraft>(() => {
    const existing = loadDrafts().find((x) => x.coinMint === data.coin.mint);
    if (existing) return existing;
    return { ...defaults.current, id: `draft-${Date.now()}`, savedAt: Date.now() };
  });
  const [copied, setCopied] = useState('');
  const [showAllFields, setShowAllFields] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [toast, setToast] = useState('');
  const dirtyRef = useRef(false);
  const lastSavedRef = useRef(d.savedAt);

  const set = useCallback(<K extends keyof TokenDraft>(key: K, val: TokenDraft[K]) => {
    setD((prev) => ({ ...prev, [key]: val, savedAt: Date.now() }));
    dirtyRef.current = true;
  }, []);

  // Auto-save every 5s
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => {
      setD((prev) => {
        if (prev.savedAt === lastSavedRef.current) return prev;
        const drafts = loadDrafts().filter((x) => x.id !== prev.id);
        drafts.push(prev);
        saveDrafts(drafts);
        lastSavedRef.current = prev.savedAt;
        return prev;
      });
    }, 5000);
    return () => clearInterval(id);
  }, [open]);

  // Warn before close
  const handleClose = useCallback(() => {
    if (dirtyRef.current) {
      setConfirmClose(true);
    } else {
      onClose();
    }
  }, [onClose]);

  const confirmCloseNow = useCallback(() => {
    // Save before closing
    const drafts = loadDrafts().filter((x) => x.id !== d.id);
    drafts.push(d);
    saveDrafts(drafts);
    dirtyRef.current = false;
    setConfirmClose(false);
    onClose();
  }, [d, onClose]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  }, []);

  const handleCopyAll = useCallback(async () => {
    await copyText(buildCopyPackage(d));
    showToast('Copied everything!');
  }, [d, showToast]);

  const handleCopyImagePrompt = useCallback(async () => {
    await copyText(d.imagePrompt);
    showToast('Image prompt copied!');
  }, [d.imagePrompt, showToast]);

  const handleCopyPrompt = useCallback(async (text: string, label: string) => {
    await copyText(text);
    showToast(`${label} copied!`);
  }, [showToast]);

  const handleSaveDraft = useCallback(() => {
    const drafts = loadDrafts().filter((x) => x.id !== d.id);
    drafts.push(d);
    saveDrafts(drafts);
    dirtyRef.current = false;
    showToast('Draft saved!');
  }, [d, showToast]);

  const handleDuplicate = useCallback(() => {
    const dup = { ...d, id: `draft-${Date.now()}`, savedAt: Date.now(), name: `${d.name} (Copy)` };
    const drafts = loadDrafts();
    drafts.push(dup);
    saveDrafts(drafts);
    setD(dup);
    showToast('Draft duplicated!');
  }, [d, showToast]);

  const handleDelete = useCallback(() => {
    const drafts = loadDrafts().filter((x) => x.id !== d.id);
    saveDrafts(drafts);
    onClose();
  }, [d.id, onClose]);

  const handleExportJSON = useCallback(() => {
    const json = JSON.stringify(d, null, 2);
    downloadFile(json, `${d.ticker}-token.json`, 'application/json');
    showToast('JSON exported!');
  }, [d, showToast]);

  const handleExportMarkdown = useCallback(() => {
    const md = buildMarkdown(d);
    downloadFile(md, `${d.ticker}-token.md`, 'text/markdown');
    showToast('Markdown exported!');
  }, [d, showToast]);

  if (!open) return null;

  const field = (label: string, key: keyof TokenDraft, opts?: { rows?: number; mono?: boolean }) => (
    <div className="mb-2">
      <label className="block text-[9px] uppercase tracking-wider text-zinc-500 mb-0.5">{label}</label>
      {opts?.rows ? (
        <textarea
          value={String(d[key])}
          onChange={(e) => set(key, e.target.value as never)}
          rows={opts.rows}
          className={`w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-[11px] text-zinc-200 resize-y focus:border-fuchsia-500 focus:outline-none ${opts.mono ? 'font-mono' : ''}`}
        />
      ) : (
        <input
          value={String(d[key])}
          onChange={(e) => set(key, e.target.value as never)}
          className={`w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-[11px] text-zinc-200 focus:border-fuchsia-500 focus:outline-none ${opts?.mono ? 'font-mono' : ''}`}
        />
      )}
    </div>
  );

  const promptRow = (label: string, key: keyof TokenDraft) => (
    <div className="mb-2">
      <div className="flex items-center justify-between mb-0.5">
        <label className="text-[9px] uppercase tracking-wider text-zinc-500">{label}</label>
        <button onClick={() => handleCopyPrompt(String(d[key]), label)} className="text-[8px] text-fuchsia-400 hover:text-fuchsia-300">Copy</button>
      </div>
      <textarea
        value={String(d[key])}
        onChange={(e) => set(key, e.target.value as never)}
        rows={2}
        className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-[10px] font-mono text-zinc-300 resize-y focus:border-fuchsia-500 focus:outline-none"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={handleClose}>
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {data.coin.image && <img src={data.coin.image} alt="" className="h-8 w-8 rounded-lg border border-zinc-700" />}
            <div>
              <h2 className="font-mono text-sm font-bold text-zinc-100">Create Token: {d.name}</h2>
              <p className="text-[10px] text-zinc-500">${d.ticker} — pre-filled from Launch Radar</p>
            </div>
          </div>
          <button onClick={handleClose} className="text-zinc-500 hover:text-zinc-300 text-lg">✕</button>
        </div>

        {/* Toast */}
        {toast && (
          <div className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-[10px] text-emerald-300 text-center font-bold">
            {toast}
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={handleCopyAll} className="rounded-lg border border-fuchsia-500/40 bg-fuchsia-950/30 px-3 py-1.5 text-[10px] font-bold text-fuchsia-300 hover:bg-fuchsia-900/40 transition-colors">
            Copy Everything
          </button>
          <button onClick={handleCopyImagePrompt} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-[10px] font-bold text-zinc-400 hover:bg-zinc-800 transition-colors">
            Copy Image Prompt
          </button>
          <button onClick={handleSaveDraft} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-[10px] font-bold text-zinc-400 hover:bg-zinc-800 transition-colors">
            Save Draft
          </button>
          <button onClick={handleDuplicate} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-[10px] font-bold text-zinc-400 hover:bg-zinc-800 transition-colors">
            Duplicate
          </button>
          <button onClick={handleExportJSON} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-[10px] font-bold text-zinc-400 hover:bg-zinc-800 transition-colors">
            Export JSON
          </button>
          <button onClick={handleExportMarkdown} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-[10px] font-bold text-zinc-400 hover:bg-zinc-800 transition-colors">
            Export Markdown
          </button>
          <button onClick={handleDelete} className="rounded-lg border border-red-500/30 px-3 py-1.5 text-[10px] font-bold text-red-400 hover:bg-red-950/30 transition-colors ml-auto">
            Delete Draft
          </button>
        </div>

        {/* Core Fields */}
        <div className="grid grid-cols-2 gap-3">
          {field('Token Name', 'name')}
          {field('Ticker', 'ticker', { mono: true })}
        </div>
        {field('Description', 'description', { rows: 2 })}
        {field('Story', 'story', { rows: 3 })}
        {field('Lore', 'lore', { rows: 2 })}
        {field('Narrative', 'narrative', { rows: 1 })}
        {field('Why It Can Go Viral', 'whyViral', { rows: 2 })}
        {field('Target Audience', 'targetAudience', { rows: 1 })}
        {field('Mascot', 'mascot', { rows: 2 })}

        {/* Visual Section */}
        <div className="mt-3 border-t border-zinc-800 pt-3">
          <h3 className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2 font-bold">Visual Identity</h3>
          {field('Visual Style', 'visualStyle', { rows: 2 })}
          {field('Color Palette', 'colorPalette', { mono: true })}
          {promptRow('Image Prompt', 'imagePrompt')}
          {promptRow('Logo Prompt', 'logoPrompt')}
          {promptRow('Banner Prompt', 'bannerPrompt')}
          {promptRow('Negative Prompt', 'negativePrompt')}
        </div>

        {/* Links */}
        <div className="mt-3 border-t border-zinc-800 pt-3">
          <h3 className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2 font-bold">Links</h3>
          <div className="grid grid-cols-3 gap-3">
            {field('Website', 'website', { mono: true })}
            {field('Twitter', 'twitter', { mono: true })}
            {field('Telegram', 'telegram', { mono: true })}
          </div>
        </div>

        {/* Token Config */}
        <div className="mt-3 border-t border-zinc-800 pt-3">
          <h3 className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2 font-bold">Token Configuration</h3>
          <div className="grid grid-cols-2 gap-3">
            {field('Supply', 'supply', { mono: true })}
            {field('Decimals', 'decimals', { mono: true })}
          </div>
        </div>

        {/* Show/Hide Extra */}
        <button onClick={() => setShowAllFields(!showAllFields)} className="mt-3 text-[9px] uppercase tracking-wider text-zinc-600 hover:text-zinc-400">
          {showAllFields ? '▾ Hide' : '▸ Show'} Creator Notes
        </button>
        {showAllFields && (
          <div className="mt-2">
            {field('Creator Notes', 'creatorNotes', { rows: 3 })}
          </div>
        )}

        {/* Confirm Close Dialog */}
        {confirmClose && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50" onClick={() => setConfirmClose(false)}>
            <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl max-w-sm" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-mono text-sm font-bold text-zinc-100 mb-2">Unsaved Changes</h3>
              <p className="text-xs text-zinc-400 mb-4">You have unsaved edits. Save before closing?</p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setConfirmClose(false)} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-[10px] font-bold text-zinc-400 hover:bg-zinc-800">
                  Cancel
                </button>
                <button onClick={handleDelete} className="rounded-lg border border-red-500/30 px-3 py-1.5 text-[10px] font-bold text-red-400 hover:bg-red-950/30">
                  Discard
                </button>
                <button onClick={confirmCloseNow} className="rounded-lg bg-fuchsia-600 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-fuchsia-500">
                  Save & Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Expose coin for img tag — unused, see data.coin.image above
