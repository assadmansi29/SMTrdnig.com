// UTC comes from the server. performance.now only measures elapsed time/RTT;
// changing the device clock or timezone cannot change market time.
let anchorUtc = NaN;
let anchorMono = 0;
let measured = false;
export function serverNow(): number {
  return anchorUtc + performance.now() - anchorMono;
}
export function observeServerTime(utc: number): void {
  if (!measured && Number.isFinite(utc)) {
    anchorUtc = utc;
    anchorMono = performance.now();
  }
}
export async function synchronizeServerClock(): Promise<void> {
  const start = performance.now();
  try {
    const response = await fetch('/api/market/time', {cache:'no-store'});
    if (!response.ok) return;
    const {serverTime} = await response.json();
    const end = performance.now();
    if (!Number.isFinite(serverTime) || end-start > 5000) return;
    anchorUtc = serverTime + (end-start)/2;
    anchorMono = end;
    measured = true;
  } catch { /* Keep the last synchronized monotonic clock while reconnecting. */ }
}
