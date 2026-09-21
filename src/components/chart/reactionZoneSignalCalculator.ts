/**
 * Reaction Zone Signal Engine
 *
 * Server-observed touch, small rejection, separate retest, then confirmation.
 * Breakouts require a closed candle and adjacent next opening beyond the level.
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
interface ZoneSignalState {
  linePrice: number;
  bias: ReactionZoneBias;
  state: ReactionLineState;
  lastProcessedClosedTime: number;
  lastObservedAt: number;
  lastLiveTime: number;
  lastLiveClose: number | null;
  lastHigh: number;
  lastLow: number;
  pointSize: number;
  closedContact: boolean;
  lastCountedTouchTime: number;
  breakDirection: ReactionZoneBias | null;
  rejectionDirection: ReactionZoneBias | null;
  test1Time: number | null;
  test2Time: number | null;
  lastTouchIndex: number;
  contactPrice: number;
  bestDistance: number;
  touchReleased: boolean;
  expiredAt: number | null;
  setupAt: number;
  activeSignal: ReactionZoneSignal | null;
  signals: ReactionZoneSignal[];
  assessment: ReactionLevelAssessment;
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

const sideOf = (price:number, level:number) => price > level ? 1 : price < level ? -1 : 0;
const directionOf = (side:number):ReactionZoneBias => side > 0 ? 'bullish' : 'bearish';
const directionSide = (direction:ReactionZoneBias) => direction === 'bullish' ? 1 : -1;
const validBar = (bar:CandleData) => [bar.open,bar.high,bar.low,bar.close].every(p=>Number.isFinite(p)&&p>0)
  && bar.high>=Math.max(bar.open,bar.close) && bar.low<=Math.min(bar.open,bar.close);
const nearBar = (bar:CandleData,level:number,unit:number) => Math.max(bar.low-level,level-bar.high,0)<=4*unit;

function resetSetup(state:ZoneSignalState) {
  state.state=state.breakDirection?'BREAK':'IDLE';
  state.rejectionDirection=state.breakDirection??state.rejectionDirection;
  state.test1Time=null;state.test2Time=null;state.touchReleased=false;
  state.bestDistance=0;state.activeSignal=null;
}
function initialState(linePrice:number,bias:ReactionZoneBias,candles:CandleData[],symbol:string):ZoneSignalState {
  const history=candles.slice(0,-1),unit=reactionPointUnit(symbol).size;
  let touches=0,breaks=0,contact=false,role:ReactionZoneBias|null=null;
  // Context only: never replay historical bars into TEST/entry events.
  for(let i=0;i<history.length;i++) {
    const bar=history[i];if(!validBar(bar))continue;
    const near=nearBar(bar,linePrice,unit);
    if(near&&!contact)touches++;
    contact=near&&Math.abs(bar.close-linePrice)<=4*unit;
    const next=candles[i+1],previous=history[i-1];
    const side=sideOf(bar.close,linePrice);
    const from=role?directionSide(role):sideOf(previous?.close??bar.open,linePrice);
    if(side&&from&&side!==from&&next&&parseCandleTimestamp(next.time)===parseCandleTimestamp(bar.time)+300&&sideOf(next.open,linePrice)===side) {
      role=directionOf(side);breaks++;
    }
  }
  return {linePrice,bias,state:role?'BREAK':'IDLE',lastProcessedClosedTime:parseCandleTimestamp(history.at(-1)?.time),
    lastObservedAt:0,lastLiveTime:0,lastLiveClose:null,lastHigh:NaN,lastLow:NaN,pointSize:unit,
    closedContact:contact,lastCountedTouchTime:parseCandleTimestamp(history.at(-1)?.time),breakDirection:role,rejectionDirection:role,
    test1Time:null,test2Time:null,lastTouchIndex:-1,contactPrice:linePrice,bestDistance:0,
    touchReleased:false,expiredAt:null,setupAt:0,activeSignal:null,signals:[],
    assessment:{confluence:bias==='bearish'?'3–4+ intersections':'two-line X',touches,breaks,fresh:touches===0,
      historyFrom:parseCandleTimestamp(history[0]?.time),approachPressure:'balanced',holdStrength:0,breakoutRisk:'normal'}};
}

function updatePressure(state:ZoneSignalState,candles:CandleData[],symbol:string) {
  const side=directionSide(state.rejectionDirection??state.breakDirection??directionOf(sideOf(candles.at(-1)!.close,state.linePrice)||1));
  const bars=candles.slice(-4,-1),unit=reactionPointUnit(symbol).size;
  const bodies=bars.map(c=>-side*(c.close-c.open));
  const strong=bars.length===3&&bars.every((c,i)=>bodies[i]>0&&bodies[i]>=Math.max(unit,(c.high-c.low)*.65))
    && bodies[2]>=bodies[0];
  const weakening=bodies.length>=2&&bodies.at(-1)!<bodies.at(-2)!;
  state.assessment.approachPressure=strong?'strong':weakening?'weakening':'balanced';
  state.assessment.breakoutRisk=strong?'elevated':'normal';
  // Red/green strength is evidence only; color must never choose trade direction.
  state.assessment.holdStrength=Math.max(0,(state.bias==='bearish'?4:2)+(state.assessment.fresh?2:0)
    -Math.max(0,state.assessment.touches-1)*.5-state.assessment.breaks-(strong?2:weakening?-1:0));
}

/** A break always needs an adjacent closed candle + next opening beyond the level. */
function observeBreak(state:ZoneSignalState,candles:CandleData[],emit?:(bar:CandleData,index:number)=>void) {
  for(let i=0;i<candles.length-1;i++) {
    const bar=candles[i],time=parseCandleTimestamp(bar.time);
    if(time<=state.lastProcessedClosedTime)continue;
    state.lastProcessedClosedTime=time;
    const next=candles[i+1];
    if(!validBar(bar)||!validBar(next)||parseCandleTimestamp(next.time)!==time+300)continue;
    // Account for intervening history without activating an inactive zone. Do not
    // count the same candle's already-observed live contact a second time.
    const near=nearBar(bar,state.linePrice,state.pointSize);
    if(near&&!state.closedContact&&time>state.lastCountedTouchTime) {
      state.assessment.touches++;state.assessment.fresh=false;state.lastCountedTouchTime=time;
    }
    state.closedContact=near&&Math.abs(bar.close-state.linePrice)<=4*state.pointSize;
    const side=sideOf(bar.close,state.linePrice);
    const from=state.breakDirection??state.rejectionDirection;
    const previousSide=from?directionSide(from):sideOf(candles[i-1]?.close??bar.open,state.linePrice);
    if(!side||!previousSide||side===previousSide||sideOf(next.open,state.linePrice)!==side)continue;
    state.breakDirection=directionOf(side);state.assessment.breaks++;
    resetSetup(state);state.expiredAt=null;
    // The candle opening beyond confirms BREAK; it is not also the retest.
    state.setupAt=parseCandleTimestamp(next.time)*1000;
    emit?.(bar,i);
  }
}

export function resetReactionZoneSignalState(lineId?:string):void {
  if(lineId)zoneStates.delete(lineId);else zoneStates.clear();
}
export function hasPendingReactionZoneSetup(lineId:string):boolean {
  const state=zoneStates.get(lineId);
  return !!state&&state.test1Time!==null&&!state.state.startsWith('CONFIRMED');
}
/** Preserve level history/role, discard inactive confirmation, never emit a delayed entry. */
export function suspendReactionZoneSignals(lineId:string,candles:CandleData[],nowMs=NaN):void {
  const state=zoneStates.get(lineId);if(!state||candles.length<2)return;
  observeBreak(state,candles);
  resetSetup(state);
  state.lastLiveClose=candles.at(-1)!.close;
  state.lastLiveTime=parseCandleTimestamp(candles.at(-1)!.time);
  state.lastHigh=candles.at(-1)!.high;state.lastLow=candles.at(-1)!.low;
  if(Number.isFinite(nowMs))state.lastObservedAt=nowMs;
}

/** Called only with authoritative server observation time; no device-clock fallback. */
export function evaluateReactionZoneSignals(
  linePrice:number,candles:CandleData[],zoneType?:'strong'|'weak',lineId?:string,interval?:string,
  symbol='',nowMs=NaN,liveObservation=true,allowTouch=true
):LineEvaluationResult {
  const bias=zoneBias(zoneType),key=zoneKey(linePrice,zoneType,lineId);
  let state=zoneStates.get(key);
  if(!state||state.linePrice!==linePrice) {
    state=initialState(linePrice,bias,candles,symbol);zoneStates.set(key,state);
  } else if(state.bias!==bias) {
    state.bias=bias;
    state.assessment.confluence=bias==='bearish'?'3–4+ intersections':'two-line X';
    if(candles.length)updatePressure(state,candles,symbol);
  }
  const result=():LineEvaluationResult=>({state:state.state,activeSignal:state.activeSignal,signals:[...state.signals],
    lastTouchIndex:state.lastTouchIndex,approachDirection:(state.rejectionDirection??bias)==='bearish'?'upward':'downward',
    isPriceNear:false,hasRecentInteraction:false,assessment:{...state.assessment}});
  if(!isFiveMinuteInterval(interval)||!Number.isFinite(linePrice)||linePrice<=0||candles.length<2||!liveObservation)return result();
  const live=candles.at(-1)!,time=parseCandleTimestamp(live.time),unit=reactionPointUnit(symbol).size;
  if(!validBar(live)||!Number.isFinite(nowMs)||time%300!==0||nowMs<time*1000||nowMs>=time*1000+300000
    ||nowMs<=state.lastObservedAt||time<state.lastLiveTime)return result();
  const gap=state.lastObservedAt>0&&nowMs-state.lastObservedAt>15000;
  const previous=state.lastLiveClose??candles.at(-2)!.close;
  const extremes=[live.close];
  if(time!==state.lastLiveTime||live.high>state.lastHigh)extremes.push(live.high);
  if(time!==state.lastLiveTime||live.low<state.lastLow)extremes.push(live.low);
  state.lastObservedAt=nowMs;state.lastLiveClose=live.close;state.lastLiveTime=time;
  state.lastHigh=live.high;state.lastLow=live.low;
  const emit=(signal:ReactionZoneSignal)=>{
    signal.id=`${key}:${signal.type}:${nowMs}`;
    state.signals.push(signal);state.signals=state.signals.slice(-100);state.activeSignal=signal;
  };
  let broke=false;
  observeBreak(state,candles,(bar,index)=>{
    broke=true;
    if(gap||index!==candles.length-2||nowMs-time*1000>15000)return;
    const signal=createTestSignal('test',key,bar,index,linePrice,state.breakDirection!);
    emit({...signal,type:'break',label:'● BREAK',subLabel:undefined});
  });
  if(!allowTouch){suspendReactionZoneSignals(key,candles,nowMs);return result();}
  if(broke)return result();
  if(gap){resetSetup(state);state.expiredAt=nowMs;return result();}
  if(state.state.startsWith('CONFIRMED'))return result();
  const distance=Math.abs(live.close-linePrice)/unit;
  // Expiration is latched: returning into range cannot resurrect the old validation.
  if(state.test1Time!==null&&(extremes.some(p=>!isWithinReactionEntryDistance(p,linePrice,symbol))
    ||state.test2Time!==null&&nowMs-state.setupAt>300000)) {
    resetSetup(state);state.expiredAt=nowMs;return result();
  }
  if(state.expiredAt!==null) {
    // Require a genuinely new approach, not the stale candle wick or a resumed timer.
    if(distance>4||Math.abs(previous-linePrice)/unit<=4)return result();
    state.expiredAt=null;
  }
  const role=state.breakDirection;
  const approach=role??state.rejectionDirection??(sideOf(previous,linePrice)?directionOf(sideOf(previous,linePrice)):null);
  if(!approach)return result();
  const side=directionSide(approach),signed=side*(live.close-linePrice)/unit;
  // An intrabar crossing cancels rejection but never reverses the role by itself.
  if(signed<-.1||state.test1Time!==null&&extremes.some(p=>side*(p-linePrice)/unit<-.1)) {
    resetSetup(state);state.expiredAt=nowMs;return result();
  }
  const near=distance<=4+1e-8;
  if(state.test1Time===null) {
    if(!near||nowMs<=state.setupAt)return result();
    state.rejectionDirection=approach;state.test1Time=time;state.setupAt=nowMs;
    state.lastCountedTouchTime=time;
    state.contactPrice=live.close;state.bestDistance=signed;state.lastTouchIndex=candles.length-1;
    state.state=role?'RETEST':'TEST_1';state.assessment.fresh=state.assessment.touches===0;
    state.assessment.touches++;updatePressure(state,candles,symbol);
    return result();
  }
  const rejection=state.assessment.approachPressure==='strong'?2:1;
  const move=side*(live.close-state.contactPrice)/unit;
  if(move>10+1e-8){resetSetup(state);state.expiredAt=nowMs;return result();}
  if(state.test2Time===null) {
    if(!state.touchReleased) {
      if(move>=rejection-1e-8&&signed>0) {
        state.touchReleased=true;state.bestDistance=signed;state.state='WAITING_FOR_TEST_2';
        const signal=createTestSignal('test',key,live,candles.length-1,linePrice,approach);
        emit(role?{...signal,type:'retest',label:'● RETEST'}:signal);
      }else if(move<0)state.contactPrice=live.close;
      return result();
    }
    state.bestDistance=Math.max(state.bestDistance,signed);
    // Small departure + actual return: neither a new candle nor ten points of
    // departure is required. An unchanged price or an old wick is not a retest.
    if(state.bestDistance-signed>=1-1e-8&&near&&side*(previous-live.close)>0) {
      state.test2Time=time;state.setupAt=nowMs;state.contactPrice=live.close;
      state.lastCountedTouchTime=time;state.assessment.fresh=false;
      state.state='WAITING_FOR_CLOSE_CONFIRMATION';state.assessment.touches++;
      updatePressure(state,candles,symbol);
      emit(createTestSignal('test2',key,live,candles.length-1,linePrice,approach));
    }
    return result();
  }
  if(move<rejection-1e-8||signed<=0)return result();
  if(role) {
    const closed=candles.at(-2)!;
    if(parseCandleTimestamp(closed.time)<state.test2Time||parseCandleTimestamp(closed.time)+300!==time
      ||side*(closed.close-linePrice)<=0||side*(live.open-linePrice)<=0)return result();
  } else if(nowMs-state.setupAt<60000)return result();
  const signal=createConfirmationSignal(key,live,candles.length-1,linePrice,approach,!!role,symbol,live.close);
  signal.entryPrice=live.close;signal.entryAt=nowMs;signal.validation=role?'breakout':'test2-60s';
  signal.label=side>0?'▲ ENTRY BUY':'▼ ENTRY SELL';
  emit(signal);state.state=side>0?'CONFIRMED_BUY':'CONFIRMED_SELL';
  return result();
}

/** Compatibility helper; confirmation still uses the same deterministic evaluator. */
export function advanceReactionZoneValidation(lineId:string,candles:CandleData[],symbol:string,nowMs=NaN):ReactionZoneSignal|null {
  const state=zoneStates.get(lineId);if(!state)return null;
  const result=evaluateReactionZoneSignals(state.linePrice,candles,state.bias==='bearish'?'strong':'weak',lineId,'5',symbol,nowMs);
  return result.activeSignal?.entryPrice?result.activeSignal:null;
}
export function calculateReactionZoneSignals(linePrice:number,candles:CandleData[],interval?:string,lineId?:string,zoneType?:'strong'|'weak'):ReactionZoneSignal[] {
  return evaluateReactionZoneSignals(linePrice,candles,zoneType,lineId,interval).signals;
}
