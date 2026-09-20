/**
 * Reaction Zone Signal Engine
 *
 * Touch visibility remains scoped to the interacting zone. Normal rejection
 * validates the next 5-minute candle; breakout retests keep closed-candle confirmation.
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
  | 'break'
  | 'retest'
  | 'sell_rejection'
  | 'buy_bounce'
  | 'buy_breakout'
  | 'sell_breakdown';
export type ReactionSignalDirection = 'bullish' | 'bearish' | 'neutral';
export type ReactionZoneBias = 'bullish' | 'bearish';

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
  slPrice?: number;
  slPoints?: number;
  formattedSlPrice?: string;
  entryPrice?: number;
  entryAt?: number;
  validation?: 'test2-60s' | 'next-candle-60s' | 'breakout';
}

export type ReactionLineState =
  | 'IDLE'
  | 'TEST_1'
  | 'WAITING_FOR_TEST_2'
  | 'TEST_2'
  | 'WAITING_FOR_CLOSE_CONFIRMATION'
  | 'BREAK'
  | 'RETEST'
  | 'CONFIRMED_BUY'
  | 'CONFIRMED_SELL';

export interface LineEvaluationResult {
  state: ReactionLineState;
  activeSignal: ReactionZoneSignal | null;
  signals: ReactionZoneSignal[];
  lastTouchIndex: number;
  approachDirection: 'upward' | 'downward';
  // Retained for renderer compatibility. They are not used to confirm or show a signal.
  isPriceNear: boolean;
  hasRecentInteraction: boolean;
}

interface ZoneSignalState {
  linePrice: number;
  bias: ReactionZoneBias;
  state: ReactionLineState;
  lastProcessedClosedTime: number;
  test1Time: number | null;
  test1Index: number;
  test1Candle: CandleData | null;
  test2Time: number | null;
  test2Index: number;
  touchReleased: boolean;
  touchDistance: number;
  releaseTime: number | null;
  lastLiveTime: number | null;
  lastLiveClose: number | null;
  breakTime: number | null;
  breakDirection: ReactionZoneBias | null;
  retestTime: number | null;
  retest2Time: number | null;
  rejectionDirection: ReactionZoneBias | null;
  rejectionObservation: {barTime:number; low:number; high:number} | null;
  activeSignal: ReactionZoneSignal | null;
  signals: ReactionZoneSignal[];
  validation: { startedAt: number; lastObservedAt: number; direction: ReactionZoneBias; tolerance: number; barTime:number; low:number; high:number } | null;
  entryDistanceRejected: boolean;
  retestObservation: {barTime:number; low:number; high:number} | null;
}

const zoneStates = new Map<string, ZoneSignalState>();

/** Explicit instrument units; Gold follows the platform's 0.10 = one point convention. */
export function reactionPointUnit(symbol: string): {size:number; label:string; decimals:number} {
  const ticker = symbol.toUpperCase().split(':').pop()!.replace('/', '');
  if (/^(XAU|GOLD)/.test(ticker)) return {size:0.1,label:'Points',decimals:2};
  if (/^(BTC|NAS|US30|DE30|SPX|GER|US100|US500)/.test(ticker)) return {size:1,label:'Points',decimals:2};
  if (/^(WTI|BCO|XAG)/.test(ticker)) return {size:0.01,label:'Points',decimals:3};
  if (/^[A-Z]{6}$/.test(ticker)) return {size:ticker.endsWith('JPY')?0.01:0.0001,label:'Pips',decimals:ticker.endsWith('JPY')?3:5};
  return {size:1,label:'Points',decimals:2};
}

/** Normal rejection entries may move up to 25 instrument points from the level. */
export function isWithinReactionEntryDistance(price:number, linePrice:number, symbol:string):boolean {
  const rounding=Number.EPSILON*Math.max(1,Math.abs(price),Math.abs(linePrice))*4;
  return Number.isFinite(price) && Number.isFinite(linePrice)
    && Math.abs(price-linePrice)<=25*reactionPointUnit(symbol).size+rounding;
}

export function parseCandleTimestamp(timeVal: any): number {
  if (typeof timeVal === 'number' && Number.isFinite(timeVal) && timeVal > 0) return timeVal;
  const numeric = Number(timeVal);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  if (typeof timeVal === 'string') {
    const parsed = Math.floor(new Date(timeVal).getTime() / 1000);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 0;
}

export function calculateAverageCandleRange(candles: CandleData[], count: number = 20): number {
  const slice = candles.slice(-count);
  const ranges = slice
    .map((c) => Math.abs(c.high - c.low))
    .filter((range) => Number.isFinite(range) && range > 0);
  return ranges.length ? ranges.reduce((sum, range) => sum + range, 0) / ranges.length : 0;
}

export interface StopLossInfo {
  slPrice: number;
  slPoints: number;
  slDistance: number;
  formattedSlPrice: string;
}

/** Stop distance is measured from entry using the instrument's point unit. */
export function calculateStopLossForReactionZone(
  linePrice: number,
  direction: 'sell' | 'buy',
  targetPoints: number = 25,
  symbol = ''
): StopLossInfo {
  const points = Math.min(35, Math.max(25, Number.isFinite(targetPoints) ? targetPoints : 25));
  const unit = reactionPointUnit(symbol);
  const slDistance = points * unit.size;
  const decimals = unit.decimals;
  const rawPrice = direction === 'sell' ? linePrice + slDistance : linePrice - slDistance;

  return {
    slPrice: Number(rawPrice.toFixed(decimals)),
    slPoints: points,
    slDistance,
    formattedSlPrice: rawPrice.toFixed(decimals),
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
  const isForex = linePrice < 10;
  const isJpyOrCommodity = linePrice >= 10 && linePrice < 1000;
  const isGold = linePrice >= 1000 && linePrice <= 5000;
  let touchTolerance = avgRange * 0.2;
  if (isForex) touchTolerance = Math.max(touchTolerance, 0.00015);
  else if (isJpyOrCommodity) touchTolerance = Math.max(touchTolerance, 0.03);
  else if (isGold) touchTolerance = Math.max(touchTolerance, 0.35);
  else touchTolerance = Math.max(touchTolerance, 3);

  return {
    P: linePrice,
    touchTolerance,
    // Kept for callers that use the shared tolerance interface; break confirmation is close-to-line.
    breakoutTolerance: touchTolerance,
    pullbackDistance: touchTolerance,
    nearThreshold: touchTolerance,
  };
}

export function isPriceNearLine(currentPrice: number, linePrice: number, avgRange: number): boolean {
  return Math.abs(currentPrice - linePrice) <= computeZoneTolerances(linePrice, avgRange).touchTolerance;
}

function zoneBias(zoneType?: 'strong' | 'weak'): ReactionZoneBias {
  // Zone color only supplies visual approach metadata. Entries use close/open position.
  return zoneType === 'weak' ? 'bullish' : 'bearish';
}

function zoneKey(linePrice: number, zoneType?: 'strong' | 'weak', lineId?: string): string {
  return lineId || `reaction-zone:${zoneType || 'strong'}:${linePrice}`;
}

function isFiveMinuteInterval(interval?: string): boolean {
  const normalized = String(interval || '').trim().toLowerCase();
  return normalized === '5' || normalized === '5m';
}

function createTestSignal(
  type: 'test' | 'test2',
  key: string,
  candle: CandleData,
  candleIndex: number,
  linePrice: number,
  bias: ReactionZoneBias
): ReactionZoneSignal {
  const time = parseCandleTimestamp(candle.time);
  return {
    id: `${key}:${type}:${time}`,
    type,
    direction: 'neutral',
    time,
    price: bias === 'bearish' ? candle.high : candle.low,
    candle,
    candleIndex,
    linePrice,
    label: type === 'test' ? '● TEST 1' : '● TEST 2',
    subLabel: type === 'test' ? '1st Touch' : '2nd Touch',
    approachDirection: bias === 'bearish' ? 'upward' : 'downward',
  };
}

function createConfirmationSignal(
  key: string,
  candle: CandleData,
  candleIndex: number,
  linePrice: number,
  bias: ReactionZoneBias,
  breakout = false,
  symbol = '',
  entryPrice = candle.close
): ReactionZoneSignal {
  const direction = bias === 'bearish' ? 'sell' : 'buy';
  const stopLoss = calculateStopLossForReactionZone(entryPrice, direction, 25, symbol);
  const isSell = direction === 'sell';
  const time = parseCandleTimestamp(candle.time);

  return {
    id: `${key}:${isSell ? 'confirmed-sell' : 'confirmed-buy'}:${time}`,
    type: breakout ? (isSell ? 'sell_breakdown' : 'buy_breakout') : (isSell ? 'sell_rejection' : 'buy_bounce'),
    direction: isSell ? 'bearish' : 'bullish',
    time,
    price: isSell ? candle.low : candle.high,
    candle,
    candleIndex,
    linePrice,
    label: isSell ? '▼ SELL' : '▲ BUY',
    subLabel: `${isSell ? 'Close + Next Open Below' : 'Close + Next Open Above'} Zone | SL: ${stopLoss.formattedSlPrice}`,
    approachDirection: isSell ? 'upward' : 'downward',
    slPrice: stopLoss.slPrice,
    slPoints: stopLoss.slPoints,
    formattedSlPrice: stopLoss.formattedSlPrice,
  };
}

function initialState(linePrice: number, bias: ReactionZoneBias, lastProcessedClosedTime: number): ZoneSignalState {
  return {
    linePrice,
    bias,
    state: 'IDLE',
    // Historical candles establish context only; they can never create a new setup.
    lastProcessedClosedTime,
    test1Time: null,
    test1Index: -1,
    test1Candle: null,
    test2Time: null,
    test2Index: -1,
    touchReleased: false,
    touchDistance: 0,
    releaseTime: null,
    lastLiveTime: null,
    lastLiveClose: null,
    breakTime: null,
    breakDirection: null,
    retestTime: null,
    retest2Time: null,
    rejectionDirection: null,
    rejectionObservation: null,
    activeSignal: null,
    signals: [],
    validation: null,
    entryDistanceRejected: false,
    retestObservation: null,
  };
}

/** Guards pending entries, including when the proximity label is hidden. */
export function advanceReactionZoneValidation(lineId:string, candles:CandleData[], symbol:string, nowMs=Date.now()): ReactionZoneSignal | null {
  const state=zoneStates.get(lineId), live=candles[candles.length-1];
  if (state && live && !state.breakDirection && !state.validation && state.rejectionObservation && state.state !== 'CONFIRMED_BUY' && state.state !== 'CONFIRMED_SELL') {
    const observed=state.rejectionObservation, barTime=parseCandleTimestamp(live.time);
    const newBar=barTime!==observed.barTime;
    if (!isWithinReactionEntryDistance(live.close,state.linePrice,symbol)
      || ((newBar || live.low<observed.low) && !isWithinReactionEntryDistance(live.low,state.linePrice,symbol))
      || ((newBar || live.high>observed.high) && !isWithinReactionEntryDistance(live.high,state.linePrice,symbol))) state.entryDistanceRejected=true;
    state.rejectionObservation={barTime,low:live.low,high:live.high};
  }
  if (!state?.validation || !live || state.state !== 'WAITING_FOR_CLOSE_CONFIRMATION') return null;
  const validation=state.validation;
  const side=validation.direction==='bullish'?1:-1;
  if (!Number.isFinite(live.close)) return null;
  const barTime=parseCandleTimestamp(live.time);
  const newBar=barTime!==validation.barTime;
  const adverse=side===1 ? (newBar || live.low<validation.low?live.low:live.close) : (newBar || live.high>validation.high?live.high:live.close);
  const leftEntryArea=!isWithinReactionEntryDistance(live.close,state.linePrice,symbol)
    || ((newBar || live.low<validation.low) && !isWithinReactionEntryDistance(live.low,state.linePrice,symbol))
    || ((newBar || live.high>validation.high) && !isWithinReactionEntryDistance(live.high,state.linePrice,symbol));
  validation.barTime=barTime;validation.low=live.low;validation.high=live.high;
  if (side*(adverse-state.linePrice) < -validation.tolerance) {
    state.validation=null; // Existing closed-candle BREAK → RETEST flow still owns breakouts.
    state.entryDistanceRejected=true;
    return null;
  }
  if(leftEntryArea) {
    state.validation=null;
    state.entryDistanceRejected=true;
    return null; // Returning inside the cap must not revive this expired validation timer.
  }
  const liveTime=parseCandleTimestamp(live.time)*1000;
  if (nowMs < liveTime || nowMs >= liveTime+300000 || nowMs-validation.lastObservedAt>15000) {
    // Never count an unobserved feed outage/history replay as a minute of validation.
    validation.startedAt=nowMs;
    validation.lastObservedAt=nowMs;
    return null;
  }
  validation.lastObservedAt=nowMs;
  if(nowMs-validation.startedAt<60000 || side*(live.open-state.linePrice)<=0 || side*(live.close-state.linePrice)<=reactionPointUnit(symbol).size*0.1) return null;
  const signal=createConfirmationSignal(lineId,live,candles.length-1,state.linePrice,validation.direction,false,symbol);
  const unit=reactionPointUnit(symbol);
  signal.entryPrice=live.close;
  signal.entryAt=nowMs;
  signal.validation='next-candle-60s';
  signal.slPrice=live.close-side*25*unit.size;
  signal.formattedSlPrice=signal.slPrice.toFixed(unit.decimals);
  signal.label=side===1?'▲ ENTRY BUY':'▼ ENTRY SELL';
  signal.subLabel='New candle · 60-second rejection validated';
  state.validation=null;
  state.state=side===1?'CONFIRMED_BUY':'CONFIRMED_SELL';
  state.signals.push(signal);
  state.activeSignal=signal;
  return signal;
}

export function resetReactionZoneSignalState(lineId?: string): void {
  if (lineId) zoneStates.delete(lineId);
  else zoneStates.clear();
}

/** Only a zone already touched live may continue confirmation outside label proximity. */
export function hasPendingReactionZoneSetup(lineId: string): boolean {
  const state = zoneStates.get(lineId);
  return !!state && state.state !== 'CONFIRMED_BUY' && state.state !== 'CONFIRMED_SELL'
    && (state.test1Time !== null || state.breakDirection !== null);
}

/** Inactive zones cannot replay missed candles into new signals on reactivation. */
export function suspendReactionZoneSignals(lineId: string, candles: CandleData[]): void {
  const state = zoneStates.get(lineId);
  if (!state || candles.length < 2) return;
  if (state.state === 'CONFIRMED_BUY' || state.state === 'CONFIRMED_SELL') {
    zoneStates.delete(lineId);
    return;
  }
  state.lastProcessedClosedTime = Math.max(state.lastProcessedClosedTime, parseCandleTimestamp(candles[candles.length - 2].time));
  const live = candles[candles.length - 1];
  if (!state.touchReleased && Math.abs(live.close - state.linePrice) > state.touchDistance) {
    state.touchReleased = true;
    state.releaseTime = parseCandleTimestamp(live.time);
  }
  state.lastLiveTime = parseCandleTimestamp(live.time);
  state.lastLiveClose = live.close;
}

/**
 * Processes live touches and each newly closed five-minute candle once.
 * Initial history establishes a baseline, never a retrospective entry.
 */
export function evaluateReactionZoneSignals(
  linePrice: number,
  candles: CandleData[],
  zoneType?: 'strong' | 'weak',
  lineId?: string,
  interval?: string,
  symbol = '',
  nowMs = Date.now(),
  liveObservation = true,
  allowTouch = true
): LineEvaluationResult {
  const bias = zoneBias(zoneType);
  const key = zoneKey(linePrice, zoneType, lineId);
  let state = zoneStates.get(key);
  if (!state || state.linePrice !== linePrice || state.bias !== bias) {
    const latestClosedCandle = candles.length >= 2 ? candles[candles.length - 2] : undefined;
    state = initialState(linePrice, bias, latestClosedCandle ? parseCandleTimestamp(latestClosedCandle.time) : 0);
    zoneStates.set(key, state);
  }

  const result = (): LineEvaluationResult => ({
    state: state!.state,
    activeSignal: state!.activeSignal,
    signals: [...state!.signals],
    lastTouchIndex: state!.test2Index >= 0 ? state!.test2Index : state!.test1Index,
    approachDirection: bias === 'bearish' ? 'upward' : 'downward',
    isPriceNear: false,
    hasRecentInteraction: false,
  });

  if (!isFiveMinuteInterval(interval) || !Number.isFinite(linePrice) || linePrice <= 0 || candles.length < 2) {
    return result();
  }
  if (!allowTouch && !hasPendingReactionZoneSetup(key)) return result();

  // The chart always appends/updates a live candle. Only earlier bars are closed and eligible.
  const closedCandles = candles.slice(0, -1);
  const tolerance = computeZoneTolerances(linePrice, calculateAverageCandleRange(closedCandles, 20)).touchTolerance;

  const emit = (signal: ReactionZoneSignal) => {
    state!.signals.push(signal);
    state!.activeSignal = signal;
  };
  const emitBreakStage = (type: 'break' | 'retest', candle: CandleData, index: number) => {
    const signal = createTestSignal('test', key, candle, index, linePrice, state!.breakDirection!);
    emit({ ...signal, id: `${key}:${type}:${signal.time}`, type, label: type === 'break' ? '● BREAK' : '● RETEST', subLabel: undefined });
  };

  const markDeparture = (candle: CandleData) => {
    if (!state!.touchReleased && Math.abs(candle.close - linePrice) > state!.touchDistance) {
      state!.touchReleased = true;
      state!.releaseTime = parseCandleTimestamp(candle.time);
    }
    if (!state!.breakDirection && state!.touchReleased && !state!.activeSignal && state!.test1Candle) {
      emit(createTestSignal('test', key, state!.test1Candle, state!.test1Index, linePrice, bias));
    }
  };
  const processTouch = (candle: CandleData, candleIndex: number, live = false) => {
    if (!allowTouch) return;
    const time = parseCandleTimestamp(candle.time);
    // On repeated ticks, only the newly observed price segment can be a return.
    // Reusing the candle's old wick would count continuing departure as TEST 2.
    const sameLiveBar = live && state!.lastLiveTime === time && state!.lastLiveClose !== null;
    const low = sameLiveBar ? Math.min(state!.lastLiveClose!, candle.close) : candle.low;
    const high = sameLiveBar ? Math.max(state!.lastLiveClose!, candle.close) : candle.high;
    const contactDistance = Math.max(low - linePrice, linePrice - high, 0);
    if(state!.entryDistanceRejected && !state!.breakDirection && live && time>(state!.test2Time ?? state!.test1Time ?? time) && contactDistance<=tolerance && isWithinReactionEntryDistance(candle.close,linePrice,symbol)) {
      // A fresh later touch starts the existing TEST 1 → TEST 2 sequence again.
      Object.assign(state!,initialState(linePrice,bias,state!.lastProcessedClosedTime));
    }
    if (state!.state === 'TEST_1' && time > state!.test1Time!) state!.state = 'WAITING_FOR_TEST_2';
    if (!time || contactDistance > tolerance) return;
    if (state!.state === 'BREAK' && time > state!.breakTime!) {
      state!.state = 'RETEST';
      state!.retestTime = time;
      state!.retest2Time = null;
      state!.touchReleased = false;
      state!.touchDistance = contactDistance;
      state!.releaseTime = null;
      state!.retestObservation={barTime:time,low:candle.low,high:candle.high};
      emitBreakStage('retest', candle, candleIndex);
    } else if (state!.state === 'RETEST' && !state!.retest2Time && state!.touchReleased && time > state!.retestTime! && contactDistance <= state!.touchDistance && (live || time > state!.releaseTime!)) {
      state!.retest2Time = time;
      emit(createTestSignal('test2', key, candle, candleIndex, linePrice, state!.breakDirection!));
    } else if (state!.state === 'IDLE') {
      state!.state = 'TEST_1';
      state!.test1Time = time;
      state!.test1Index = candleIndex;
      state!.test1Candle = { ...candle };
      state!.touchReleased = false;
      state!.releaseTime = null;
      state!.touchDistance = contactDistance;
      const approach=state!.lastLiveClose ?? candles[candleIndex-1]?.close ?? candle.open;
      state!.rejectionDirection=approach>linePrice?'bullish':approach<linePrice?'bearish':null;
      state!.rejectionObservation={barTime:time,low:candle.low,high:candle.high};
    } else if ((state!.state === 'WAITING_FOR_TEST_2' || (state!.state === 'WAITING_FOR_CLOSE_CONFIRMATION' && state!.test2Time === null)) && state!.touchReleased && contactDistance <= state!.touchDistance && time > state!.test1Time! && (live || time > state!.releaseTime!)) {
      state!.state = 'WAITING_FOR_CLOSE_CONFIRMATION';
      state!.test2Time = time;
      state!.test2Index = candleIndex;
      const signal = createTestSignal('test2', key, candle, candleIndex, linePrice, bias);
      emit(signal);
      // TEST 2 remains visible, but entry is timed from a respected next candle below/above.
    }
  };

  // A reaction observed while inactive is published only on reactivation,
  // before a returning touch can advance the setup to TEST 2.
  if (!state.breakDirection && state.touchReleased && !state.activeSignal && state.test1Candle) {
    emit(createTestSignal('test', key, state.test1Candle, state.test1Index, linePrice, bias));
  }



  closedCandles.forEach((candle, candleIndex) => {
    const closedTime = parseCandleTimestamp(candle.time);
    if (!closedTime || closedTime <= state!.lastProcessedClosedTime) return;
    state!.lastProcessedClosedTime = closedTime;

    const previous = candles[candleIndex - 1];
    const crossedDirection = (previous && previous.close <= linePrice + tolerance || !state!.breakDirection && state!.rejectionDirection === 'bearish') && candle.close > linePrice + tolerance ? 'bullish'
      : (previous && previous.close >= linePrice - tolerance || !state!.breakDirection && state!.rejectionDirection === 'bullish') && candle.close < linePrice - tolerance ? 'bearish' : null;
    // Departing on the respected approach side is a rejection, not a breakout.
    const breakDirection = !state!.breakDirection && crossedDirection === state!.rejectionDirection ? null : crossedDirection;
    if (breakDirection && breakDirection !== state!.breakDirection) {
      state!.validation=null;
      state!.entryDistanceRejected=false;
      state!.state = 'BREAK';
      state!.breakTime = closedTime;
      state!.breakDirection = breakDirection;
      state!.retestTime = null;
      state!.retest2Time = null;
      state!.retestObservation = null;
      emitBreakStage('break', candle, candleIndex);
      return; // The breaking candle cannot also be its own retest.
    }

    if (state!.state === 'CONFIRMED_BUY' || state!.state === 'CONFIRMED_SELL') return;

    if (state!.breakDirection && (state!.breakDirection === 'bullish' ? candle.close <= linePrice : candle.close >= linePrice)) {
      state!.state='BREAK';
      state!.breakTime=closedTime;
      state!.retestTime=null;
      state!.retest2Time=null;
      state!.retestObservation=null;
      state!.validation=null;
      state!.activeSignal=null;
      return; // Failed retest stays in breaker mode; never revive the old rejection.
    }

    processTouch(candle, candleIndex);
    markDeparture(candle);

    const next = candles[candleIndex + 1];
    const adjacent = next && parseCandleTimestamp(next.time) === closedTime + 300;
    const direction = adjacent && candle.close < linePrice && next.open < linePrice ? 'bearish'
      : adjacent && candle.close > linePrice && next.open > linePrice ? 'bullish' : null;
    if (state!.validation && next && parseCandleTimestamp(next.time) !== state!.validation.barTime) state!.validation=null;
    if (liveObservation && direction && next === candles[candles.length-1] && !state!.breakDirection && !state!.entryDistanceRejected && state!.test1Time !== null && state!.touchReleased && direction === state!.rejectionDirection && !state!.validation) {
      state!.state='WAITING_FOR_CLOSE_CONFIRMATION';
      state!.validation={startedAt:nowMs,lastObservedAt:nowMs,direction,tolerance,barTime:parseCandleTimestamp(next.time),low:next.open,high:next.open};
    }
    const breakoutReady = state!.state === 'RETEST' && state!.retest2Time !== null && closedTime >= state!.retest2Time && direction === state!.breakDirection;
    if (direction && breakoutReady) {
      const liveCandle=candles[candles.length-1],livePrice=liveCandle.close;
      const liveTime=parseCandleTimestamp(liveCandle.time)*1000;
      if (!liveObservation || next!==liveCandle || nowMs<liveTime || nowMs>=liveTime+300000
        || (direction==='bullish'?livePrice<=linePrice:livePrice>=linePrice)) return;
      const signal=createConfirmationSignal(key, candle, candleIndex, linePrice, direction, true,symbol,livePrice);
      signal.entryPrice=livePrice;
      signal.entryAt=nowMs;
      signal.validation='breakout';
      const unit=reactionPointUnit(symbol);
      signal.slPrice=livePrice+(direction==='bearish'?1:-1)*25*unit.size;
      signal.formattedSlPrice=signal.slPrice.toFixed(unit.decimals);
      emit(signal);
      state!.state = direction === 'bearish' ? 'CONFIRMED_SELL' : 'CONFIRMED_BUY';
    }
  });

  const liveCandle = candles[candles.length - 1];
  if (liveObservation && parseCandleTimestamp(liveCandle.time) > state.lastProcessedClosedTime) {
    processTouch(liveCandle, candles.length - 1, true);
    markDeparture(liveCandle);
    state.lastLiveTime = parseCandleTimestamp(liveCandle.time);
    state.lastLiveClose = liveCandle.close;
  }

  if(liveObservation)advanceReactionZoneValidation(key,candles,symbol,nowMs);

  return result();
}

export function calculateReactionZoneSignals(
  linePrice: number,
  candles: CandleData[],
  interval?: string,
  lineId?: string,
  zoneType?: 'strong' | 'weak'
): ReactionZoneSignal[] {
  return evaluateReactionZoneSignals(linePrice, candles, zoneType, lineId, interval).signals;
}
