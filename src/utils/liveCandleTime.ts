// Preserve the provider's session alignment (including OANDA daily opens).
// Feed times are seconds; tolerate millisecond event timestamps at the boundary.
export function timestampSeconds(time: number): number {
  return time > 100_000_000_000 ? Math.floor(time / 1000) : Math.floor(time);
}

export function liveCandleTime(time: number, lastOpen: number, duration: number): number {
  const seconds = timestampSeconds(time);
  return lastOpen + Math.floor((seconds - lastOpen) / duration) * duration;
}
