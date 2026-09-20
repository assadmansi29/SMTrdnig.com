# Liquidity Reader and economic feed audit

## Scope and isolation

The reader has a separate read-only route, adapter client, bounded five-symbol cache and request deduplication. It never reads or writes chart drawings, strategy storage, subscriptions or database records. The existing chart provider configuration and Save Strategy code are unchanged.

## Liquidity data

- BTCUSDT: Binance public spot depth (100 price levels each side), sampled every five seconds, and latest 500 aggregate trades. These are aggregated displayed quantities, not identified institutional orders. Bid/ask imbalance uses quote notional within the returned depth. Trade pressure uses buyer-maker direction; its actual sample duration is displayed.
- Gold, Nasdaq, US30 and WTI: existing OANDA/TradingView adapter, 288 five-minute candles, sampled every 30 seconds. Prior 20 closed-bar extremes, candle pressure and a typical-price activity histogram are estimates. Provider volume is not exchange volume-at-price; absent volume uses candle counts. A closed-bar rejection beyond the prior range is labelled a sweep candidate.
- Absorption and order-book sweeps are not claimed from snapshots/OHLC. These require synchronized depth and trade histories and suitable licensed feeds for the non-crypto instruments.
- Timestamps and stale/error states remain visible. No fabricated fallback observations. Polling stops when closed and pauses when the document is hidden; overlapping requests are prevented.

Public API reference: https://github.com/binance/binance-spot-api-docs/blob/master/faqs/market_data_only.md

## News/calendar decision

Retain BiQuote rather than introduce an unconfigured paid provider. The installed News section is an economic-release feed, not a breaking-news wire. BiQuote aggregates sources including MQL5; no guaranteed latency or comprehensive geopolitical/crypto headline coverage is established. Production data licensing and an SLA must be confirmed with the provider before promising either.

Audit found keyword-based impact promotion, malformed timestamps becoming current time, one failed source request aborting other responses, duplicate aggregate records, and GET refresh depending on database writes (blocked locally). The read path now merges fresh provider events in memory, preserves provider importance, rejects invalid/ambiguous times, tolerates partial endpoint outages, deduplicates matching events, flags conflicting times and exposes source links. No data migration or cleanup was performed. Existing scheduled notification delivery was not invoked or changed.

The calendar client polls every 30 seconds; provider publication delay remains additional and unknown. Stored fallback is explicitly marked delayed. UTC is converted with Intl/IANA timezones and DST support; date filters use the selected local timezone. Tentative/all-day source times are labelled. Today, tomorrow, rolling seven days, impact and currency filters reuse the existing Calendar UI.

## Validation

Live read-only endpoint checks returned Bitcoin depth and OANDA candles for all four requested instruments, including WTI. Calendar public API responded successfully. Browser verification uses the real components and local API through an isolated origin without mounting a drawing manager. Deterministic tests cover liquidity mathematics, closed candles, missing volume, partial provider failures, timestamp validation and the existing 35-case timezone suite. No test saves or deletes production chart records.
