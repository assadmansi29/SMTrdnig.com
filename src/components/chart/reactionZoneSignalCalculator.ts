/**
 * Reaction Zone Signal Engine
 *
 * Professional state-based signal engine strictly driven by live price interactions
 * with institutional Reaction Zone levels.
 *
 * EXACT TRADING & RISK RULES:
 * 1. ONLY LIVE & CURRENT LINE:
 *    - Operates exclusively when price is NEAR the line.
 *    - Stale signals that price has surpassed/moved away from are cleared and NOT shown.
 * 2. FIRST TOUCH:
 *    - When price reaches and touches the line for the first time -> 'TEST'.
 * 3. SECOND TOUCH:
 *    - When price pulls back and touches the line again -> 'TEST 2'.
 * 4. HOLD / NO BREAK (BAR CLOSED & NEW BAR OPENED):
 *    - If price approached from below (upward move into resistance) and held without breaking:
 *      -> '▼ SELL' with Stop Loss strictly contained between 20 and 35 points (default 28 pts).
 *    - If price approached from above (downward move into support) and held without breaking:
 *      -> '▲ BUY' with Stop Loss strictly contained between 20 and 35 points (default 28 pts).
 * 5. BREAKOUT / BREAKDOWN (PRICE BROKE THE LINE):
 *    - If price moves UP and breaks above the line -> '▲ BUY' (Bullish Breakout).
 *    - If price moves DOWN and breaks below the line -> '▼ SELL' (Bearish Breakdown).
 */

export interface CandleData {
  time: number | string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export type ReactionSignalType =
  | 'test'
  | 'test2'
  | 'sell_rejection'
  | 'buy_bounce'
  | 'buy_breakout'
  | 'sell_breakdown';

export type ReactionSignalDirection = 'bullish' | 'bearish' | 'neutral';

export interface ReactionZoneSignal {
  id: string;
  type: ReactionSignalType;
  direction: ReactionSignalDirection;
  time: number;
  price: number;
  candle: CandleData;
  candleIndex: number;
  linePrice: number;
  label: string;
  subLabel?: string;
  approachDirection: 'upward' | 'downward';
  // Risk & Stop Loss containment (20 to 35 points)
  slPrice?: number;
  slPoints?: number;
  formattedSlPrice?: string;
}

export interface ReactionLineInfo {
  id: string;
  price: number;
  zoneType?: 'strong' | 'weak';
}

export type ReactionLineState =
  | 'NEUTRAL'
  | 'TEST_1'
  | 'TEST_2'
  | 'SELL_REJECTION'
  | 'BUY_BOUNCE'
  | 'BUY_BREAKOUT'
  | 'SELL_BREAKDOWN';

export interface LineEvaluationResult {
  state: ReactionLineState;
  activeSignal: ReactionZoneSignal | null;
  signals: ReactionZoneSignal[];
  lastTouchIndex: number;
  approachDirection: 'upward' | 'downward';
  isPriceNear: boolean;
  hasRecentInteraction: boolean;
}

/**
 * Normalizes candle timestamp to epoch seconds.
 */
export function parseCandleTimestamp(timeVal: any): number {
  if (typeof timeVal === 'number' && !isNaN(timeVal) && timeVal > 0) return timeVal;
  const n = Number(timeVal);
  if (!isNaN(n) && n > 0) return n;
  if (typeof timeVal === 'string') {
    const parsed = Math.floor(new Date(timeVal).getTime() / 1000);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 0;
}

/**
 * Calculates average candle range over recent candles to calibrate volatility.
 */
export function calculateAverageCandleRange(candles: CandleData[], count: number = 20): number {
  if (!candles || candles.length === 0) return 0;
  const slice = candles.slice(-count);
  let sum = 0;
  let validCount = 0;
  for (const c of slice) {
    const rng = Math.abs(c.high - c.low);
    if (!isNaN(rng) && rng > 0) {
      sum += rng;
      validCount++;
    }
  }
  return validCount > 0 ? sum / validCount : 0;
}

export interface StopLossInfo {
  slPrice: number;
  slPoints: number;
  slDistance: number;
  formattedSlPrice: string;
}

/**
 * Calculates stop loss price strictly within 20 to 35 points based on asset type.
 */
export function calculateStopLossForReactionZone(
  linePrice: number,
  direction: 'sell' | 'buy',
  targetPoints: number = 28 // 20 to 35 points strictly
): StopLossInfo {
  const points = Math.min(35, Math.max(20, targetPoints));
  let slDistance = 0;

  // Gold (XAUUSD, GOLD ~ 1000 - 5000): 1 point = 0.10 USD (20 to 35 points = $2.00 to $3.50)
  if (linePrice >= 1000 && linePrice <= 5000) {
    slDistance = points * 0.1;
  } else if (linePrice > 5000) {
    // Indices (US30, NAS100, DAX/GER40, S&P 500/ES1!, BTC): 1 point = 1.0 (20 to 35 points)
    slDistance = points * 1.0;
  } else if (linePrice >= 10 && linePrice < 1000) {
    // JPY Forex pairs (USD/JPY ~ 150) or Commodities/Oil: 1 point = 0.01 (20 to 35 pips)
    slDistance = points * 0.01;
  } else if (linePrice < 10) {
    // Standard Forex pairs (EUR/USD ~ 1.08, GBP/USD ~ 1.28): 1 pip = 0.0001 (20 to 35 pips)
    slDistance = points * 0.0001;
  } else {
    slDistance = points * 1.0;
  }

  const slPrice = direction === 'sell' ? linePrice + slDistance : linePrice - slDistance;
  const decimals = linePrice < 10 ? 4 : linePrice >= 10 && linePrice < 1000 ? 3 : 2;

  return {
    slPrice: Number(slPrice.toFixed(decimals)),
    slPoints: points,
    slDistance,
    formattedSlPrice: slPrice.toFixed(decimals),
  };
}

export interface ZoneTolerances {
  P: number;
  touchTolerance: number;
  breakoutTolerance: number;
  pullbackDistance: number;
  nearThreshold: number;
}

export function computeZoneTolerances(linePrice: number, avgRange: number): ZoneTolerances {
  const P = linePrice;
  const isForex = P < 10;
  const isJpyOrCommodity = P >= 10 && P < 1000;
  const isGold = P >= 1000 && P <= 5000;

  // Touch tolerance: threshold within which price interacts with the line
  let touchTolerance = avgRange * 0.20;
  if (isForex) touchTolerance = Math.max(touchTolerance, 0.00015);
  else if (isJpyOrCommodity) touchTolerance = Math.max(touchTolerance, 0.03);
  else if (isGold) touchTolerance = Math.max(touchTolerance, 0.35);
  else touchTolerance = Math.max(touchTolerance, 3.0);

  // Breakout tolerance: decisive breach beyond which line is broken
  let breakoutTolerance = avgRange * 0.40;
  if (isForex) breakoutTolerance = Math.max(breakoutTolerance, 0.00025);
  else if (isJpyOrCommodity) breakoutTolerance = Math.max(breakoutTolerance, 0.06);
  else if (isGold) breakoutTolerance = Math.max(breakoutTolerance, 0.75);
  else breakoutTolerance = Math.max(breakoutTolerance, 5.0);

  // Pullback distance: required pull away before a second touch qualifies as Test 2
  let pullbackDistance = avgRange * 0.35;
  if (isForex) pullbackDistance = Math.max(pullbackDistance, 0.00035);
  else if (isJpyOrCommodity) pullbackDistance = Math.max(pullbackDistance, 0.08);
  else if (isGold) pullbackDistance = Math.max(pullbackDistance, 1.20);
  else pullbackDistance = Math.max(pullbackDistance, 6.0);

  // Proximity threshold
  const minAbsoluteNear = isForex ? 0.003 : isJpyOrCommodity ? 0.8 : isGold ? 8.0 : 40.0;
  const nearThreshold = Math.max(avgRange * 3.5, P * 0.003, minAbsoluteNear);

  return {
    P,
    touchTolerance,
    breakoutTolerance,
    pullbackDistance,
    nearThreshold,
  };
}

/**
 * Checks if the current live market price is near this reaction zone line.
 */
export function isPriceNearLine(
  currentPrice: number,
  linePrice: number,
  avgRange: number
): boolean {
  const tolerances = computeZoneTolerances(linePrice, avgRange);
  return Math.abs(currentPrice - linePrice) <= tolerances.nearThreshold;
}

/**
 * Determines the price direction (UP or DOWN) approaching the specific Reaction Zone line.
 * Evaluates the candles leading up to the interaction to identify where price came from:
 * - Price came from above the line and descending: direction is 'downward'.
 * - Price came from below the line and ascending: direction is 'upward'.
 */
export function determinePriceDirection(
  linePrice: number,
  candles: CandleData[],
  targetIndex: number,
  touchTolerance: number = 0
): 'upward' | 'downward' {
  const P = linePrice;
  const maxLookback = Math.min(25, targetIndex);

  for (let k = 1; k <= maxLookback; k++) {
    const c = candles[targetIndex - k];
    if (!c) continue;
    if (c.close > P + touchTolerance) {
      return 'downward'; // Came from above line, moving DOWN towards the line
    }
    if (c.close < P - touchTolerance) {
      return 'upward'; // Came from below line, moving UP towards the line
    }
  }

  const prevC = targetIndex > 0 ? candles[targetIndex - 1] : candles[targetIndex];
  return (prevC && prevC.close >= P) ? 'downward' : 'upward';
}

/**
 * Evaluates the deterministic state machine and extracts signals for a Reaction Zone line.
 *
 * EXACT USER-SPECIFIED TRADING RULES:
 * WHEN PRICE IS MOVING DOWN:
 * - If price breaks BELOW the specific Reaction Zone line it is interacting with, signal is SELL.
 * - If price reaches/interacts with that Reaction Zone but does NOT break below it, signal is BUY.
 * WHEN PRICE IS MOVING UP:
 * - If price breaks ABOVE the specific Reaction Zone line it is interacting with, signal is BUY.
 * - If price reaches/interacts with that Reaction Zone but does NOT break above it, signal is SELL.
 *
 * WHEN THE BAR IS CLOSED AND OPENS THE NEW BAR WITHOUT BREAKING THE LINE:
 * - If price went UP -> SELL with stop loss 20 to 35 points above the line.
 * - If price went DOWN -> BUY with stop loss 20 to 35 points below the line.
 *
 * AND IF THE PRICE BROKE THE LINE THE SIGNALS ARE CHANGED TO THE OTHER WAY:
 * - If price went UP and broke the line -> BUY.
 * - If price went DOWN and broke the line -> SELL.
 *
 * Stop loss strictly 20 to 35 points.
 */
export function evaluateReactionZoneSignals(
  linePrice: number,
  candles: CandleData[],
  zoneType?: 'strong' | 'weak'
): LineEvaluationResult {
  const defaultResult: LineEvaluationResult = {
    state: 'NEUTRAL',
    activeSignal: null,
    signals: [],
    lastTouchIndex: -1,
    approachDirection: zoneType === 'weak' ? 'downward' : 'upward',
    isPriceNear: false,
    hasRecentInteraction: false,
  };

  if (!candles || candles.length < 3 || !linePrice || isNaN(linePrice) || linePrice <= 0) {
    return defaultResult;
  }

  const N = candles.length;
  const currentPrice = candles[N - 1].close;
  const avgRange = calculateAverageCandleRange(candles, 20);
  const { touchTolerance, breakoutTolerance, pullbackDistance, nearThreshold } = computeZoneTolerances(
    linePrice,
    avgRange
  );
  const P = linePrice;

  // Evaluate recent price interaction cycle (up to last 60 candles)
  const maxLookback = Math.min(N, 60);
  const startIdx = Math.max(0, N - maxLookback);

  const rawSignals: ReactionZoneSignal[] = [];
  let currentState: ReactionLineState = 'NEUTRAL';
  let approachDir: 'upward' | 'downward' = determinePriceDirection(P, candles, startIdx, touchTolerance);

  let test1Idx = -1;
  let test2Idx = -1;
  let pullbackOccurred = false;
  let pullbackBarIdx = -1;
  let lastActiveSignal: ReactionZoneSignal | null = null;

  for (let i = startIdx; i < N; i++) {
    const c = candles[i];
    const prevC = i > 0 ? candles[i - 1] : c;
    const cTime = parseCandleTimestamp(c.time);

    // Dynamic approach direction when in neutral state
    if (currentState === 'NEUTRAL') {
      approachDir = determinePriceDirection(P, candles, i, touchTolerance);
    }

    // 1. Check if candle physically touches or interacts with the line level
    const isTouching =
      (c.high >= P - touchTolerance && c.low <= P + touchTolerance) ||
      (c.high >= P && c.low <= P) ||
      Math.abs(c.high - P) <= touchTolerance ||
      Math.abs(c.low - P) <= touchTolerance ||
      Math.abs(c.close - P) <= touchTolerance ||
      Math.abs(c.open - P) <= touchTolerance;

    // STEP 1: FIRST TOUCH -> 'TEST'
    // Price reaches or touches the Reaction Zone for the first time.
    // MUST always begin with 'TEST' before any signals or TEST 2.
    if (currentState === 'NEUTRAL') {
      if (isTouching) {
        currentState = 'TEST_1';
        test1Idx = i;
        pullbackOccurred = false;
        pullbackBarIdx = -1;

        const sig: ReactionZoneSignal = {
          id: `sig_test1_${i}_${cTime}`,
          type: 'test',
          direction: 'neutral',
          time: cTime,
          price: approachDir === 'upward' ? c.high : c.low,
          candle: c,
          candleIndex: i,
          linePrice: P,
          label: '● TEST',
          subLabel: '1st Touch',
          approachDirection: approachDir,
        };
        rawSignals.push(sig);
        lastActiveSignal = sig;
      }
      continue;
    }

    // STEP 2: SECOND TOUCH / RE-TEST -> 'TEST 2'
    // After TEST 1, price must undergo a second test (TEST 2) before ANY signals can be issued!
    // Sequence MUST strictly be: TEST > TEST2 > SIGNALS
    if (currentState === 'TEST_1') {
      const isPullingAway =
        approachDir === 'upward'
          ? c.low <= P - (pullbackDistance * 0.5)
          : c.high >= P + (pullbackDistance * 0.5);

      if (isPullingAway) {
        pullbackOccurred = true;
        pullbackBarIdx = i;
      }

      // Second test occurs if:
      // - Price pulled away and re-tests the line (isTouching)
      // - OR a subsequent candle tests/touches the line (i > test1Idx && isTouching)
      const isSecondTest =
        (pullbackOccurred && i > pullbackBarIdx && isTouching) ||
        (i > test1Idx && isTouching);

      if (isSecondTest) {
        currentState = 'TEST_2';
        test2Idx = i;
        pullbackOccurred = false;

        const sig: ReactionZoneSignal = {
          id: `sig_test2_${i}_${cTime}`,
          type: 'test2',
          direction: 'neutral',
          time: cTime,
          price: approachDir === 'upward' ? c.high : c.low,
          candle: c,
          candleIndex: i,
          linePrice: P,
          label: '● TEST 2',
          subLabel: '2nd Touch',
          approachDirection: approachDir,
        };
        rawSignals.push(sig);
        lastActiveSignal = sig;
        continue;
      }

      // If price moved far away from the zone without ever completing TEST 2, reset to NEUTRAL
      const dist = Math.min(Math.abs(c.close - P), Math.abs(c.low - P), Math.abs(c.high - P));
      if (dist > nearThreshold * 1.6 && i > test1Idx + 12) {
        currentState = 'NEUTRAL';
        test1Idx = -1;
        pullbackOccurred = false;
      }

      // STRICT MANDATE: While in TEST_1, NEVER issue Buy/Sell/Breakout signals!
      // Must progress through TEST 2 first!
      continue;
    }

    // STEP 3: AFTER TEST AND TEST 2 -> SIGNALS
    // Both TEST 1 and TEST 2 have now occurred (currentState === 'TEST_2').
    // Now and ONLY now do we evaluate confirmed entry signals:
    // - If line held without breaking -> SELL (if approached upward) or BUY (if approached downward) with 20-35 pt SL.
    // - If line broke -> BUY (if broke above) or SELL (if broke below) with 20-35 pt SL.
    if (currentState === 'TEST_2') {
      // Check if price decisively breaks the line
      const isBreakoutUp = c.close > P + breakoutTolerance;
      const isBreakdownDown = c.close < P - breakoutTolerance;

      if (isBreakoutUp) {
        const slInfo = calculateStopLossForReactionZone(P, 'buy', 28);
        currentState = 'BUY_BREAKOUT';
        const sig: ReactionZoneSignal = {
          id: `sig_break_buy_${i}_${cTime}`,
          type: 'buy_breakout',
          direction: 'bullish',
          time: cTime,
          price: c.low,
          candle: c,
          candleIndex: i,
          linePrice: P,
          label: `▲ BUY`,
          subLabel: `Breakout Above | SL: ${slInfo.formattedSlPrice}`,
          approachDirection: 'upward',
          slPrice: slInfo.slPrice,
          slPoints: slInfo.slPoints,
          formattedSlPrice: slInfo.formattedSlPrice,
        };
        rawSignals.push(sig);
        lastActiveSignal = sig;
        continue;
      }

      if (isBreakdownDown) {
        const slInfo = calculateStopLossForReactionZone(P, 'sell', 28);
        currentState = 'SELL_BREAKDOWN';
        const sig: ReactionZoneSignal = {
          id: `sig_break_sell_${i}_${cTime}`,
          type: 'sell_breakdown',
          direction: 'bearish',
          time: cTime,
          price: c.high,
          candle: c,
          candleIndex: i,
          linePrice: P,
          label: `▼ SELL`,
          subLabel: `Breakdown Below | SL: ${slInfo.formattedSlPrice}`,
          approachDirection: 'downward',
          slPrice: slInfo.slPrice,
          slPoints: slInfo.slPoints,
          formattedSlPrice: slInfo.formattedSlPrice,
        };
        rawSignals.push(sig);
        lastActiveSignal = sig;
        continue;
      }

      // Check if the 2nd test bar closed holding the line, confirming the rejection/bounce:
      if (i > test2Idx && i <= test2Idx + 8) {
        const test2Bar = candles[test2Idx];

        if (approachDir === 'upward') {
          const testBarHeld = test2Bar.close <= P + touchTolerance;
          const currentBarHeld = c.close <= P + breakoutTolerance;

          if (testBarHeld && currentBarHeld) {
            currentState = 'SELL_REJECTION';
            const slInfo = calculateStopLossForReactionZone(P, 'sell', 28);
            const sig: ReactionZoneSignal = {
              id: `sig_sell_${i}_${cTime}`,
              type: 'sell_rejection',
              direction: 'bearish',
              time: cTime,
              price: c.high,
              candle: c,
              candleIndex: i,
              linePrice: P,
              label: `▼ SELL`,
              subLabel: `Hold Resistance | SL: ${slInfo.formattedSlPrice}`,
              approachDirection: 'upward',
              slPrice: slInfo.slPrice,
              slPoints: slInfo.slPoints,
              formattedSlPrice: slInfo.formattedSlPrice,
            };
            rawSignals.push(sig);
            lastActiveSignal = sig;
            continue;
          }
        } else if (approachDir === 'downward') {
          const testBarHeld = test2Bar.close >= P - touchTolerance;
          const currentBarHeld = c.close >= P - breakoutTolerance;

          if (testBarHeld && currentBarHeld) {
            currentState = 'BUY_BOUNCE';
            const slInfo = calculateStopLossForReactionZone(P, 'buy', 28);
            const sig: ReactionZoneSignal = {
              id: `sig_buy_${i}_${cTime}`,
              type: 'buy_bounce',
              direction: 'bullish',
              time: cTime,
              price: c.low,
              candle: c,
              candleIndex: i,
              linePrice: P,
              label: `▲ BUY`,
              subLabel: `Hold Support | SL: ${slInfo.formattedSlPrice}`,
              approachDirection: 'downward',
              slPrice: slInfo.slPrice,
              slPoints: slInfo.slPoints,
              formattedSlPrice: slInfo.formattedSlPrice,
            };
            rawSignals.push(sig);
            lastActiveSignal = sig;
            continue;
          }
        }
      }
      continue;
    }

    // STEP 4: POST-SIGNAL REVERSALS
    // "IF PRICE BROKE THE LINE THE SIGNALS SHOULD BE CHANGED TO OTHER WAY"
    if (currentState === 'SELL_REJECTION' && c.close > P + breakoutTolerance) {
      const slInfo = calculateStopLossForReactionZone(P, 'buy', 28);
      currentState = 'BUY_BREAKOUT';
      const sig: ReactionZoneSignal = {
        id: `sig_break_buy_${i}_${cTime}`,
        type: 'buy_breakout',
        direction: 'bullish',
        time: cTime,
        price: c.low,
        candle: c,
        candleIndex: i,
        linePrice: P,
        label: `▲ BUY`,
        subLabel: `Breakout Above | SL: ${slInfo.formattedSlPrice}`,
        approachDirection: 'upward',
        slPrice: slInfo.slPrice,
        slPoints: slInfo.slPoints,
        formattedSlPrice: slInfo.formattedSlPrice,
      };
      rawSignals.push(sig);
      lastActiveSignal = sig;
      continue;
    }

    if (currentState === 'BUY_BOUNCE' && c.close < P - breakoutTolerance) {
      const slInfo = calculateStopLossForReactionZone(P, 'sell', 28);
      currentState = 'SELL_BREAKDOWN';
      const sig: ReactionZoneSignal = {
        id: `sig_break_sell_${i}_${cTime}`,
        type: 'sell_breakdown',
        direction: 'bearish',
        time: cTime,
        price: c.high,
        candle: c,
        candleIndex: i,
        linePrice: P,
        label: `▼ SELL`,
        subLabel: `Breakdown Below | SL: ${slInfo.formattedSlPrice}`,
        approachDirection: 'downward',
        slPrice: slInfo.slPrice,
        slPoints: slInfo.slPoints,
        formattedSlPrice: slInfo.formattedSlPrice,
      };
      rawSignals.push(sig);
      lastActiveSignal = sig;
      continue;
    }

    // STEP 5: Risk Check / Stop Loss Breach Invalidation
    if (lastActiveSignal && lastActiveSignal.slPrice) {
      if (
        (lastActiveSignal.type === 'sell_rejection' || lastActiveSignal.type === 'sell_breakdown') &&
        c.high > lastActiveSignal.slPrice + breakoutTolerance
      ) {
        // Stop loss breached to upside
        currentState = 'NEUTRAL';
        test1Idx = -1;
        test2Idx = -1;
      } else if (
        (lastActiveSignal.type === 'buy_bounce' || lastActiveSignal.type === 'buy_breakout') &&
        c.low < lastActiveSignal.slPrice - breakoutTolerance
      ) {
        // Stop loss breached to downside
        currentState = 'NEUTRAL';
        test1Idx = -1;
        test2Idx = -1;
      }
    }
  }

  // Deduplicate signals: keep the most meaningful signal for each candle
  const visibleSignals: ReactionZoneSignal[] = [];
  const seenCandleIndices = new Set<number>();
  for (let idx = rawSignals.length - 1; idx >= 0; idx--) {
    const s = rawSignals[idx];
    if (!seenCandleIndices.has(s.candleIndex)) {
      seenCandleIndices.add(s.candleIndex);
      visibleSignals.unshift(s);
    }
  }

  const activeSignal = visibleSignals.length > 0 ? visibleSignals[visibleSignals.length - 1] : null;
  const hasRecentInteraction =
    visibleSignals.length > 0 &&
    activeSignal !== null &&
    (N - 1 - activeSignal.candleIndex) <= 45;
  const isNear = Math.abs(currentPrice - P) <= nearThreshold;

  return {
    state: currentState,
    activeSignal,
    signals: visibleSignals,
    lastTouchIndex: test2Idx !== -1 ? test2Idx : test1Idx,
    approachDirection: approachDir,
    isPriceNear: isNear,
    hasRecentInteraction,
  };
}

/**
 * Calculates live reaction zone signals for a given line price.
 */
export function calculateReactionZoneSignals(
  linePrice: number,
  candles: CandleData[],
  interval?: string,
  lineId?: string
): ReactionZoneSignal[] {
  if (!candles || candles.length < 3 || !linePrice || isNaN(linePrice) || linePrice <= 0) {
    return [];
  }
  const evalResult = evaluateReactionZoneSignals(linePrice, candles);
  return evalResult.signals;
}
