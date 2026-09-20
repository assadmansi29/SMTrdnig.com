/** Uses the actual active candle open, never a synthetic rolling clock. */
export function candleCloseTime(openTime: number, interval: string): number | null {
  const raw = interval.trim();
  const norm = raw.toLowerCase();
  if (!Number.isFinite(openTime)) return null;
  if (raw === 'M' || raw === '1M' || ['month', '1mo', '1m_month'].includes(norm)) {
    const date = new Date(openTime * 1000);
    const day = date.getUTCDate();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + 1);
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(day, lastDay));
    return date.getTime();
  }
  const named: Record<string, number> = { d: 86400, day: 86400, w: 604800, week: 604800, h: 3600 };
  const match = norm.match(/^(\d+)(m|min|h|d|w)?$/);
  const unit: Record<string, number> = { m: 60, min: 60, h: 3600, d: 86400, w: 604800 };
  const seconds = named[norm] ?? (match ? Number(match[1]) * unit[match[2] || 'm'] : 0);
  return seconds > 0 ? (openTime + seconds) * 1000 : null;
}

export function candleTimeRemaining(openTime: number, interval: string, nowMs: number): string | null {
  const closeMs = candleCloseTime(openTime, interval);
  if (closeMs === null) return null;
  const total = Math.max(0, Math.ceil((closeMs - nowMs) / 1000));
  const pad = (n: number) => String(n).padStart(2, '0');
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor(total / 60) % 60;
  return `${hours ? `${pad(hours)}:` : ''}${pad(minutes)}:${pad(total % 60)}`;
}
