import {useTranslation} from '../../context/LanguageContext';
import React,{useEffect,useState,useSyncExternalStore} from 'react';
import {serverNow} from '../../services/serverClock';

import {getReactionTrades,subscribeReactionTrades,connectReactionAuthority,clearReactionTrade,reactionTradePoints,canonicalReactionSymbol} from './reactionZoneTrades';

/** One shared server-state subscription, independent of the displayed chart/view. */
export function ReactionTradeMonitor() {
  useEffect(connectReactionAuthority,[]);
  return null;
}

export function ReactionTradePanel({symbol,strategy,isAdmin}:{symbol:string;strategy:string;isAdmin:boolean}) {
  const {t:text,dir}=useTranslation();
  const all=useSyncExternalStore(subscribeReactionTrades,getReactionTrades,getReactionTrades);
  const trades=all.filter(t=>t.symbol===canonicalReactionSymbol(symbol)&&t.strategy===strategy);
  const [now,setNow]=useState(serverNow());
  useEffect(()=>{if(!trades.length)return;const timer=setInterval(()=>setNow(serverNow()),1000);return()=>clearInterval(timer);},[trades.length]);
  if(!trades.length)return null;
  return <aside aria-label={text('reactionActiveTrades')} dir={dir} className="absolute right-3 bottom-7 z-20 max-h-[45%] w-64 max-w-[calc(100%_-_5rem)] overflow-y-auto space-y-2" onPointerDown={e=>e.stopPropagation()} onKeyDown={e=>e.stopPropagation()}>
    {trades.map(t=>{const points=reactionTradePoints(t);return <section key={t.id} className="rounded-lg border border-slate-700 bg-[#0B1220]/95 p-3 text-[11px] shadow-lg">
      <div className="flex items-center justify-between gap-2"><strong className={t.direction==='buy'?'text-emerald-400':'text-rose-400'}>{text(t.direction==='buy'?'reactionBuyActive':'reactionSellActive')}</strong><span className={points>=0?'text-emerald-400':'text-rose-400'}>{points>=0?'+':''}{points.toFixed(1)} {text(t.unitLabel==='Pips'?'reactionPips':'reactionPoints')}</span></div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 text-slate-300">{[[text('reactionEntry'),t.entry.toFixed(t.decimals)],[text('reactionCurrent'),t.current.toFixed(t.decimals)],[text('reactionStopLoss'),t.stop.toFixed(t.decimals)],[text('reactionTp1'),`${t.tp1.toFixed(t.decimals)}${t.tp1Hit?' ✓':''}`],[text('reactionTp2'),`${t.tp2.toFixed(t.decimals)}${t.tp2Hit?' ✓':''}`],[text('reactionTp3'),text('reactionOpen')]].map(([label,value])=><React.Fragment key={label}><dt className="text-slate-500">{label}</dt><dd className="text-end font-mono">{value}</dd></React.Fragment>)}</dl>
      {now-t.updatedAt>15000&&<p className="text-amber-400 mt-2">{text('reactionWaitingPrice')}</p>}
      {isAdmin&&<button type="button" onClick={()=>clearReactionTrade(t.id)} className="mt-2 text-slate-400 hover:text-white">{text('reactionClearTrade')}</button>}
    </section>;})}
  </aside>;
}
