/**
 * Reaction Zone Signal Engine
 *
 * Server-observed physical Test Candle touch, then adjacent closed-candle confirmation.
 * Context determines direction; crossing the level invalidates the setup.
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
  validation?: 'test2-60s' | 'next-candle-60s' | 'breakout' | 'test-candle-close';
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
  assessment?: ReactionLevelAssessment;
}

export interface ReactionLevelAssessment {
  confluence: '3–4+ intersections' | 'two-line X';
  touches: number;
  breaks: number;
  fresh: boolean;
  historyFrom: number;
  approachPressure: 'strong' | 'weakening' | 'balanced';
  // Relative evidence, not a calibrated probability or synthetic order-flow data.
  holdStrength: number;
  breakoutRisk: 'elevated' | 'normal';
}
/** Explicit instrument units; Gold follows the platform's 0.10 = one point convention. */
export function reactionPointUnit(symbol: string): {size:number; label:string; decimals:number} {
  const ticker = symbol.toUpperCase().split(':').pop()!.replace('/', '');
  if (/^(XAU|GOLD)/.test(ticker)) return {size:0.1,label:'Points',decimals:2};
  if (/^(BTC|NAS|US30|DE30|SPX|GER|US100|US500)/.test(ticker)) return {size:1,label:'Points',decimals:2};
  if (/^(WTI|BCO|XAG)/.test(ticker)) return {size:0.01,label:'Points',decimals:3};
  if (/^[A-Z]{6}$/.test(ticker)) return {size:ticker.endsWith('JPY')?0.01:0.0001,label:'Pips',decimals:ticker.endsWith('JPY')?3:5};
  return {size:1,label:'Points',decimals:2};
}

/** Every entry and its confirmation must stay within ten instrument points of the level. */
export function isWithinReactionEntryDistance(price:number, linePrice:number, symbol:string):boolean {
  const rounding=Number.EPSILON*Math.max(1,Math.abs(price),Math.abs(linePrice))*4;
  return Number.isFinite(price) && Number.isFinite(linePrice)
    && Math.abs(price-linePrice)<=10*reactionPointUnit(symbol).size+rounding;
}

export function parseCandleTimestamp(timeVal: any): number {
  if (typeof timeVal === 'number' && Number.isFinite(timeVal) && timeVal > 0) return timeVal >= 1e12 ? timeVal / 1000 : timeVal;
  const numeric = Number(timeVal);
  if (Number.isFinite(numeric) && numeric > 0) return numeric >= 1e12 ? numeric / 1000 : numeric;
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
  targetPoints: number = 30,
  symbol = ''
): StopLossInfo {
  const points = Math.min(35, Math.max(30, Number.isFinite(targetPoints) ? targetPoints : 30));
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

// Context classification is deliberately independent of zone color.
// Conflicting nearby swing/rejection evidence is unclassified, never reversed
// merely because the current quote crossed the level.
export function classifyReactionZone(level:number, history:CandleData[], symbol:string):ReactionZoneBias|null {
  const bars=history.slice(-40), proximity=4*reactionPointUnit(symbol).size;
  let sell=false,buy=false;
  for(let i=2;i<bars.length-2;i++) {
    const c=bars[i],neighbors=[bars[i-2],bars[i-1],bars[i+1],bars[i+2]];
    if(Math.abs(c.high-level)<=proximity&&neighbors.every(n=>n.high<c.high))sell=true;
    if(Math.abs(c.low-level)<=proximity&&neighbors.every(n=>n.low>c.low))buy=true;
  }
  for(const c of bars.slice(-6)) {
    const range=c.high-c.low;
    if(range<=0)continue;
    if(Math.abs(c.high-level)<=proximity&&c.close<c.open&&c.high-Math.max(c.open,c.close)>=range*.4)sell=true;
    if(Math.abs(c.low-level)<=proximity&&c.close>c.open&&Math.min(c.open,c.close)-c.low>=range*.4)buy=true;
  }
  if(sell||buy)return sell===buy?null:sell?'bearish':'bullish';
  const recent=bars.slice(-3);
  if(recent.length===3) {
    if(recent.every(c=>c.close<c.open&&(c.open-c.close)>=(c.high-c.low)*.6)&&recent.every(c=>c.close<level))return 'bearish';
    if(recent.every(c=>c.close>c.open&&(c.close-c.open)>=(c.high-c.low)*.6)&&recent.every(c=>c.close>level))return 'bullish';
  }
  return null;
}
interface TestCandleState {
  level:number; direction:ReactionZoneBias|null; test:CandleData|null;
  lastObservedAt:number; lastTime:number; lastHigh:number; lastLow:number;
  consumedTime:number; state:ReactionLineState; activeSignal:ReactionZoneSignal|null;
  signals:ReactionZoneSignal[]; interval:string;
}
const zoneStates=new Map<string,TestCandleState>();
export function resetReactionZoneSignalState(lineId?:string):void {
  if(lineId)zoneStates.delete(lineId);else zoneStates.clear();
}
export function hasPendingReactionZoneSetup(lineId:string):boolean {return !!zoneStates.get(lineId)?.test;}
export function suspendReactionZoneSignals(lineId:string,candles:CandleData[],nowMs=NaN):void {
  const state=zoneStates.get(lineId),live=candles.at(-1);if(!state||!live)return;
  if(state.test)state.consumedTime=parseCandleTimestamp(state.test.time);
  state.test=null;state.activeSignal=null;state.state='IDLE';
  state.lastTime=parseCandleTimestamp(live.time);state.lastHigh=live.high;state.lastLow=live.low;
  if(Number.isFinite(nowMs))state.lastObservedAt=nowMs;
}
const validBar=(c:CandleData)=>[c.open,c.high,c.low,c.close].every(p=>Number.isFinite(p)&&p>0)
  &&c.high>=Math.max(c.open,c.close)&&c.low<=Math.min(c.open,c.close);
/** Broker display precision is the existing project tick convention (not a pip). */
export const reactionPriceTick=(symbol:string)=>10**(-reactionPointUnit(symbol).decimals);

/** Only live server observations may advance a setup; history supplies context only. */
export function evaluateReactionZoneSignals(
  linePrice:number,candles:CandleData[],zoneType?:'strong'|'weak',lineId?:string,interval?:string,
  symbol='',nowMs=NaN,liveObservation=true,allowTouch=true
):LineEvaluationResult {
  const normalized=String(interval).toLowerCase().replace(/m$/,''),seconds=normalized==='1'?60:normalized==='5'?300:0;
  const key=lineId||`reaction-zone:${normalized}:${linePrice}`,live=candles.at(-1);
  let state=zoneStates.get(key);
  if(!state||state.level!==linePrice||state.interval!==normalized) {
    state={level:linePrice,direction:null,test:null,lastObservedAt:0,lastTime:parseCandleTimestamp(live?.time),
      lastHigh:live?.high??NaN,lastLow:live?.low??NaN,consumedTime:0,state:'IDLE',activeSignal:null,signals:[],interval:normalized};
    zoneStates.set(key,state);
  }
  const result=():LineEvaluationResult=>({state:state.state,activeSignal:state.activeSignal,signals:[...state.signals],
    lastTouchIndex:state.test?candles.findIndex(c=>parseCandleTimestamp(c.time)===parseCandleTimestamp(state.test!.time)):-1,
    approachDirection:state.direction==='bullish'?'downward':'upward',isPriceNear:false,hasRecentInteraction:!!state.test});
  if(!seconds||!live||candles.length<3||!Number.isFinite(linePrice)||linePrice<=0||!liveObservation)return result();
  const time=parseCandleTimestamp(live.time),epsilon=Number.EPSILON*Math.max(linePrice,live.high)*8;
  if(!validBar(live)||!Number.isFinite(nowMs)||time%seconds!==0||nowMs<time*1000||nowMs>=1000*(time+seconds)
    ||nowMs<=state.lastObservedAt||time<state.lastTime)return result();
  const gap=state.lastObservedAt>0&&nowMs-state.lastObservedAt>15000;
  const newBar=time!==state.lastTime;
  // An old historical wick must not create a fresh touch after reconnect/selection.
  const freshContact=Math.abs(live.close-linePrice)<=epsilon
    ||(newBar?live.open:state.lastHigh)<linePrice&&live.high>=linePrice&&live.low<=linePrice
    ||(newBar?live.open:state.lastLow)>linePrice&&live.low<=linePrice&&live.high>=linePrice;
  state.lastObservedAt=nowMs;state.lastTime=time;state.lastHigh=live.high;state.lastLow=live.low;
  const cancel=()=>{if(state.test)state.consumedTime=parseCandleTimestamp(state.test.time);state.test=null;state.activeSignal=null;state.state='IDLE';};
  if(!allowTouch||gap){cancel();return result();}
  const emit=(signal:ReactionZoneSignal)=>{state.signals=[...state.signals,signal].slice(-100);state.activeSignal=signal;};
  if(state.test&&state.direction) {
    const testTime=parseCandleTimestamp(state.test.time),side=state.direction==='bullish'?1:-1;
    // Any observed penetration beyond the level invalidates this Test Candle.
    const broken=(bar:CandleData)=>side>0?bar.low<linePrice-epsilon:bar.high>linePrice+epsilon;
    if(time===testTime) {
      if(broken(live)){cancel();return result();}
      state.test={...live};return result();
    }
    const test=candles.find(c=>parseCandleTimestamp(c.time)===testTime);
    if(!test||broken(test)){cancel();return result();}
    state.test={...test};
    if(time===testTime+seconds) {
      if(broken(live))cancel();
      else state.state='WAITING_FOR_CLOSE_CONFIRMATION';
      return result();
    }
    const confirmation=candles.at(-2)!;
    const adjacent=time===testTime+seconds*2&&parseCandleTimestamp(confirmation.time)===testTime+seconds;
    const confirmed=adjacent&&!broken(confirmation)&&(side>0?confirmation.close>test.high+epsilon:confirmation.close<test.low-epsilon);
    // Confirm only on the first timely observation of the immediately next bucket.
    if(!confirmed||!newBar||nowMs-time*1000>15000||broken(live)){cancel();return result();}
    const tick=reactionPriceTick(symbol),unit=reactionPointUnit(symbol);
    const stop=Number((side>0?test.low-tick:test.high+tick).toFixed(unit.decimals));
    const entry=live.close;
    if(side*(entry-stop)<=0){cancel();return result();}
    const signal:ReactionZoneSignal={id:`${key}:test-entry:${testTime}`,type:side>0?'buy_bounce':'sell_rejection',
      direction:state.direction,time:parseCandleTimestamp(confirmation.time),price:confirmation.close,candle:{...confirmation},
      candleIndex:candles.length-2,linePrice,label:side>0?'▲ ENTRY BUY':'▼ ENTRY SELL',
      approachDirection:side>0?'downward':'upward',slPrice:stop,slPoints:Math.abs(entry-stop)/unit.size,
      formattedSlPrice:stop.toFixed(unit.decimals),entryPrice:entry,entryAt:nowMs,validation:'test-candle-close'};
    state.consumedTime=testTime;state.test=null;state.state=side>0?'CONFIRMED_BUY':'CONFIRMED_SELL';emit(signal);return result();
  }
  if(time<=state.consumedTime||!freshContact)return result();
  const direction=classifyReactionZone(linePrice,candles.slice(0,-1),symbol);
  if(!direction)return result();
  const side=direction==='bullish'?1:-1;
  if(side>0?live.low<linePrice-epsilon||live.open<linePrice-epsilon:live.high>linePrice+epsilon||live.open>linePrice+epsilon)return result();
  state.direction=direction;state.test={...live};state.state='TEST_1';
  emit({id:`${key}:test:${time}`,type:'test',direction:'neutral',time,price:linePrice,candle:{...live},
    candleIndex:candles.length-1,linePrice,label:'● TEST 1',approachDirection:side>0?'downward':'upward'});
  return result();
}
export function advanceReactionZoneValidation(lineId:string,candles:CandleData[],symbol:string,nowMs=NaN):ReactionZoneSignal|null {
  const state=zoneStates.get(lineId);if(!state)return null;
  const result=evaluateReactionZoneSignals(state.level,candles,undefined,lineId,state.interval,symbol,nowMs);
  return result.activeSignal?.entryPrice?result.activeSignal:null;
}
export function calculateReactionZoneSignals(linePrice:number,candles:CandleData[],interval?:string,lineId?:string,zoneType?:'strong'|'weak'):ReactionZoneSignal[] {
  return evaluateReactionZoneSignals(linePrice,candles,zoneType,lineId,interval).signals;
}
