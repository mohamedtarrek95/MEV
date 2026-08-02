export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function shortAddr(addr: string, prefix = 4, suffix = 4): string {
  if (addr.length <= prefix + suffix + 3) return addr;
  return `${addr.slice(0, prefix)}...${addr.slice(-suffix)}`;
}

export function formatSol(n: number, digits = 4): string {
  return `${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  })} SOL`;
}

export function formatToken(n: number): string {
  if (!n) return '0';
  if (n >= 1e6) return n.toFixed(0);
  if (n >= 1) return n.toFixed(4);
  if (n >= 0.001) return n.toPrecision(4);
  return n.toExponential(2);
}

export function formatPct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
  } else {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
}
