import React,{useId,useState,useSyncExternalStore} from 'react';
import {ChevronDown} from 'lucide-react';
import {useTranslation} from '../../context/LanguageContext';
import {getWeeklyReactionResults,subscribeReactionTrades} from './reactionZoneTrades';

/** Read-only server results, placed outside the candle canvas. */
export function WeeklyTradeResults({strategy}:{strategy:string}) {
  const {t,dir,language}=useTranslation();
  const results=useSyncExternalStore(subscribeReactionTrades,getWeeklyReactionResults,getWeeklyReactionResults);
  const [expanded,setExpanded]=useState(false),detailsId=useId();
  const group=results?.strategies.find(item=>item.strategy===strategy);
  const points=group?.points??0;
  const number=(value:number)=>new Intl.NumberFormat(language,{maximumFractionDigits:2}).format(value);
  const signed=(value:number)=>`${value>0?'+':''}${number(value)}`;
  return <section dir={dir} className="shrink-0 min-w-0 border-t border-slate-800 bg-[#0B1220] text-[10px] text-slate-300" aria-label={t('weeklyResultsTitle')}>
    <button type="button" aria-expanded={expanded} aria-controls={detailsId} onClick={()=>setExpanded(value=>!value)}
      className="flex w-full min-h-8 items-center gap-2 px-3 py-1.5 text-start hover:bg-slate-800/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-slate-400">
      <span className="flex flex-1 flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <strong className="text-slate-200">{t('weeklyThisWeek')}:</strong>
        {results?<><span>{number(group?.trades??0)} {t('weeklyTrades')}</span><span aria-hidden="true">|</span><span>{number(group?.wins??0)} {t('weeklyWins')}</span><span aria-hidden="true">|</span><span>{number(group?.losses??0)} {t('weeklyLosses')}</span>
          {!!group?.breakeven&&<><span aria-hidden="true">|</span><span>{number(group.breakeven)} {t('weeklyBreakeven')}</span></>}
          <span aria-hidden="true">|</span><span className={points>0?'text-emerald-400':points<0?'text-rose-400':'text-slate-300'}>{signed(points)} {t('reactionPoints')}</span></>:<span>{t('weeklyLoading')}</span>}
      </span>
      <ChevronDown aria-hidden="true" className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 motion-reduce:transition-none ${expanded?'rotate-180':''}`}/>
    </button>
    <div id={detailsId} aria-hidden={!expanded} inert={!expanded} className={`grid transition-[grid-template-rows,opacity] duration-200 motion-reduce:transition-none ${expanded?'grid-rows-[1fr] opacity-100':'grid-rows-[0fr] opacity-0'}`}>
      <div className="min-h-0 overflow-hidden"><div className="max-h-48 overflow-auto overscroll-contain border-t border-slate-800 p-3">
        <p className="mb-2 text-slate-500">{t('weeklyWindow')}{results&&` · ${new Date(results.weekStart).toLocaleDateString(language,{timeZone:'UTC'})}`}</p>
        {!group?.records.length?<p className="py-2 text-slate-400">{t(results?'weeklyEmpty':'weeklyLoading')}</p>:<ul className="space-y-2">
          {group.records.map(record=><li key={record.id} className="rounded border border-slate-800 p-2">
            <div className="flex flex-wrap justify-between gap-2"><strong>{record.symbol.split(':').at(-1)} · {t(record.direction==='buy'?'reactionBuy':'reactionSell')}</strong><span className={record.points>0?'text-emerald-400':record.points<0?'text-rose-400':'text-slate-300'}>{t(record.outcome==='win'?'weeklyWin':record.outcome==='loss'?'weeklyLoss':'weeklyBreakeven')} · {signed(record.points)} {t(record.unitLabel==='Pips'?'reactionPips':'reactionPoints')}</span></div>
            <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1">
              <dt className="text-slate-500">{t('reactionEntry')}</dt><dd className="text-end font-mono">{record.entry.toFixed(record.decimals)}</dd>
              <dt className="text-slate-500">{t('weeklyExit')}</dt><dd className="text-end font-mono">{record.exitPrice.toFixed(record.decimals)}</dd>
              <dt className="text-slate-500">{t('weeklyClosedBy')}</dt><dd className="text-end">{t(record.reason==='stop_loss'?'reactionStopLoss':'weeklyBreakevenStop')}</dd>
              <dt className="text-slate-500">{t('weeklyTpReached')}</dt><dd className="text-end">{record.highestTp?`${t(record.highestTp==='TP2'?'reactionTp2':'reactionTp1')} ✓`:'—'}</dd>
              <dt className="text-slate-500">{t('weeklyClosedAt')}</dt><dd className="text-end"><time dateTime={new Date(record.closedAt).toISOString()}>{new Date(record.closedAt).toLocaleString(language)}</time></dd>
            </dl>
          </li>)}
        </ul>}
        <p className="mt-2 text-slate-500">{t('weeklyMethod')}</p>
      </div></div>
    </div>
  </section>;
}
