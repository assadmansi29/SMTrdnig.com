import type {ReactionTrade} from '../../server/services/reactionTradeEngine';

/** Target distances telescope: TP1 + (TP2 - TP1) + (TP3 - TP2). */
export function achievedReactionPoints(trade:ReactionTrade):number {
  const target=trade.tp3Hit&&Number.isFinite(trade.tp3)?trade.tp3!:
    trade.tp2Hit?trade.tp2:trade.tp1Hit?trade.tp1:trade.entry;
  return Number(((trade.direction==='buy'?target-trade.entry:trade.entry-target)/trade.unit).toFixed(8));
}

export function reactionTradePoints(trade:ReactionTrade):number {
  if(trade.tp1Hit||trade.tp2Hit||trade.tp3Hit)return achievedReactionPoints(trade);
  return (trade.direction==='buy'?trade.current-trade.entry:trade.entry-trade.current)/trade.unit;
}
