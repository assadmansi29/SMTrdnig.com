const aliases: Record<string, string> = {
  GOLD: 'XAUUSD', 'XAU/USD': 'XAUUSD',
  NAS100: 'NAS100USD', US100: 'NAS100USD', USTEC: 'NAS100USD',
  NQ: 'NAS100USD', 'NQ (NASDAQ)': 'NAS100USD', NASDAQ: 'NAS100USD',
  'NASDAQ 100': 'NAS100USD', NASDAQ100: 'NAS100USD',
  US30: 'US30USD', US3O: 'US30USD', US3OUSD: 'US30USD', DJ30: 'US30USD',
  WALLSTREET: 'US30USD', DOW: 'US30USD', 'DOW JONES': 'US30USD', 'US30 (DOW)': 'US30USD',
  GER40: 'DE30EUR', DE30: 'DE30EUR', DE40: 'DE30EUR', DAX: 'DE30EUR',
  DAX40: 'DE30EUR', GERMANY40: 'DE30EUR', 'GER40 (DAX)': 'DE30EUR',
  US500: 'SPX500USD', SP500: 'SPX500USD', SPX: 'SPX500USD',
};

/** Market-data routing only. Never changes saved symbols, charts, or storage keys. */
export function resolveRealtimeTvSymbol(symbol: string): string {
  const upper = (symbol || 'OANDA:XAUUSD').trim().toUpperCase();
  if (upper === 'BINANCE:BTCUSDT' || /^(BTC|BTCUSD|BTCUSDT|BTC\/USD|BITCOIN)$/.test(upper)) {
    return 'BINANCE:BTCUSDT';
  }
  if (upper.includes(':') && !upper.startsWith('OANDA:')) {
    throw new Error('Unsupported market-data provider.');
  }
  const ticker = upper.startsWith('OANDA:') ? upper.slice(6) : upper;
  // Preserve OANDA identifiers; forbid routing cryptocurrency through OANDA.
  if (/^(BTC|ETH|SOL|XRP|DOGE|LTC|BCH|ADA)/.test(ticker)) {
    throw new Error('Only Binance Bitcoin is supported for cryptocurrency.');
  }
  if (aliases[ticker]) return `OANDA:${aliases[ticker]}`;
  if (upper.startsWith('OANDA:') && /^[A-Z0-9]+$/.test(ticker)) return upper;
  const pair = ticker.replace('/', '');
  const currency = '(?:USD|EUR|GBP|JPY|CHF|CAD|AUD|NZD|SGD|HKD|CNH|CNY|ZAR|TRY|MXN|NOK|SEK|DKK|PLN|HUF|CZK|THB|XAU)';
  if (new RegExp(`^${currency}${currency}$`).test(pair)) return `OANDA:${pair}`;
  if (/^(NAS100USD|US30USD|DE30EUR|SPX500USD)$/.test(ticker)) return `OANDA:${ticker}`;
  throw new Error('Unsupported market-data symbol.');
}
