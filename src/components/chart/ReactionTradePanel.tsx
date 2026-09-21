import {useTranslation} from '../../context/LanguageContext';
import React,{useEffect,useLayoutEffect,useState,useSyncExternalStore,useId} from 'react';
import {useAuth} from '../../context/AuthContext';
import {ChevronUp} from 'lucide-react';
import {serverNow} from '../../services/serverClock';

import {getReactionTrades,subscribeReactionTrades,connectReactionAuthority,clearReactionTrade,reactionTradePoints,canonicalReactionSymbol,type ReactionTrade} from './reactionZoneTrades';

/** One shared server-state subscription, independent of the displayed chart/view. */
export function ReactionTradeMonitor() {
  const {user,token}=useAuth();
  const isAdmin=user?.role==='admin'||user?.role==='super_admin';
  useLayoutEffect(()=>connectReactionAuthority(isAdmin),[isAdmin,user?.id,token]);
  return null;
}

export function ReactionTradePanel({symbol,strategy,isAdmin}:{symbol:string;strategy:string;isAdmin:boolean}) {
  const {t:text,dir}=useTranslation();
  const all=useSyncExternalStore(subscribeReactionTrades,getReactionTrades,getReactionTrades);
  const trades=isAdmin?all.filter(t=>t.symbol===canonicalReactionSymbol(symbol)&&t.strategy===strategy):[];
  const [now,setNow]=useState(serverNow());
  useEffect(()=>{if(!trades.length)return;const timer=setInterval(()=>setNow(serverNow()),1000);return()=>clearInterval(timer);},[trades.length]);
  if(!trades.length)return null;
  return <aside data-reaction-trade-panel aria-label={text('reactionActiveTrades')} dir={dir} className="absolute right-20 bottom-14 sm:bottom-7 z-20 max-h-[45%] w-64 max-w-[calc(100%_-_9rem)] overflow-y-auto overscroll-contain space-y-2" onPointerDown={e=>e.stopPropagation()} onMouseDown={e=>e.stopPropagation()} onTouchStart={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()} onKeyDown={e=>e.stopPropagation()} onWheel={e=>e.stopPropagation()}>
    {trades.map(trade=><ReactionTradeCard key={trade.id} trade={trade} now={now} isAdmin={isAdmin}/>)}
  </aside>;
}

function ReactionTradeCard({trade:t,now,isAdmin}:{trade:ReactionTrade;now:number;isAdmin:boolean}) {
  const {t:text}=useTranslation();
  // Per-card presentation state only; live snapshots never reset the user's choice.
  const [expanded,setExpanded]=useState(()=>typeof window==='undefined'||!window.matchMedia('(max-width: 639px)').matches);
  const detailsId=useId();
  const points=reactionTradePoints(t);
  return <section className="rounded-lg border border-slate-700 bg-[#0B1220]/95 text-[11px] shadow-lg">
    <button type="button" aria-expanded={expanded} aria-controls={detailsId}
      aria-label={text(expanded?'reactionCollapseTrade':'reactionExpandTrade')}
      onClick={()=>setExpanded(value=>!value)}
      className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg p-3 text-start cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-inset">
      <strong className={t.direction==='buy'?'text-emerald-400':'text-rose-400'}>{text(t.direction==='buy'?'reactionBuyActive':'reactionSellActive')}</strong>
      <span className={`ms-auto whitespace-nowrap ${points>=0?'text-emerald-400':'text-rose-400'}`}>{points>=0?'+':''}{points.toFixed(1)} {text(t.unitLabel==='Pips'?'reactionPips':'reactionPoints')}</span>
      <ChevronUp aria-hidden="true" className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 motion-reduce:transition-none ${expanded?'rotate-180':''}`}/>
    </button>
    <div id={detailsId} aria-hidden={!expanded} inert={!expanded}
      className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${expanded?'grid-rows-[1fr] opacity-100':'grid-rows-[0fr] opacity-0'}`}>
      <div className="min-h-0 overflow-hidden"><div className="px-3 pb-3">
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-300">{[[text('reactionEntry'),t.entry.toFixed(t.decimals)],[text('reactionCurrent'),t.current.toFixed(t.decimals)],[text('reactionStopLoss'),t.stop.toFixed(t.decimals)],[text('reactionTp1'),`${t.tp1.toFixed(t.decimals)}${t.tp1Hit?' ✓':''}`],[text('reactionTp2'),`${t.tp2.toFixed(t.decimals)}${t.tp2Hit?' ✓':''}`],[text('reactionTp3'),text('reactionOpen')]].map(([label,value])=><React.Fragment key={label}><dt className="text-slate-500">{label}</dt><dd className="text-end font-mono">{value}</dd></React.Fragment>)}</dl>
        {now-t.updatedAt>15000&&<p className="text-amber-400 mt-2">{text('reactionWaitingPrice')}</p>}
        {isAdmin&&<button type="button" onClick={()=>clearReactionTrade(t.id)} className="mt-2 text-slate-400 hover:text-white">{text('reactionClearTrade')}</button>}
      </div></div>
    </div>
  </section>;
}
