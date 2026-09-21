import React, {useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {Activity, ArrowLeft, RefreshCw} from 'lucide-react';
import {useTranslation} from '../context/LanguageContext';
import {liquidityText, liquidityError} from '../locales/liquidity';
import {getLiquidityChartContext,subscribeLiquidityChartContext} from '../services/liquidityChartContext';
import {liquiditySymbol,liquidityInterval} from '../utils/liquiditySymbols';
import type {LiquidityReport} from '../utils/liquidityAnalysis';

const instruments=[['XAUUSD','Gold'],['NASDAQ','Nasdaq'],['US30','Dow Jones'],['WTI','WTI Oil'],['BTCUSDT','Bitcoin']];

export function LiquidityReader({onClose}:{onClose:()=>void}) {
  const {language,dir,isRTL}=useTranslation();
  const locale={en:'en-US',ar:'ar',uk:'uk-UA',ru:'ru-RU'}[language];
  const text=(value:string,params:Record<string,string|number>={})=>liquidityText(value,language,params);
  const number=(n:number)=>n.toLocaleString(locale,{maximumFractionDigits:data?.priceDecimals??2});
  const fixed=(n:number,digits:number)=>n.toLocaleString(locale,{minimumFractionDigits:digits,maximumFractionDigits:digits});
  const chart=useSyncExternalStore(subscribeLiquidityChartContext,getLiquidityChartContext,getLiquidityChartContext);
  const readerSymbol=(value:string)=>{try{return liquiditySymbol(value).split(':')[1];}catch{return value;}};
  const [symbol,setSymbol]=useState(()=>readerSymbol(chart?.symbol||'BTCUSDT'));
  const [interval,setInterval]=useState(()=>liquidityInterval(chart?.interval||'5').interval);
  useEffect(()=>{if(chart){setSymbol(readerSymbol(chart.symbol));setInterval(liquidityInterval(chart.interval).interval);}},[chart?.symbol,chart?.interval]);
  const options=[...instruments];
  if(!options.some(([id])=>readerSymbol(id)===symbol))options.push([symbol,symbol]);
  const [data,setData]=useState<LiquidityReport|null>(null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const [refresh,setRefresh]=useState(0);
  const closeRef=useRef<HTMLButtonElement>(null);
  useEffect(()=>{const previous=document.activeElement as HTMLElement;closeRef.current?.focus();const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();};document.addEventListener('keydown',onKey);return()=>{document.removeEventListener('keydown',onKey);previous?.focus();};},[onClose]);
  useEffect(()=>{
    let cancelled=false,timer:ReturnType<typeof setTimeout>;
    const controller=new AbortController();
    setData(null);setError('');setLoading(true);
    const poll=async()=>{
      if(document.hidden){timer=setTimeout(poll,5000);return;}
      try {
        const response=await fetch(`/api/liquidity?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}`,{signal:controller.signal});
        const result=await response.json();
        if(!response.ok)throw new Error(result.error||'Feed unavailable');
        if(!cancelled){setData(result);setError('');}
      }catch(e){if(!cancelled)setError(e instanceof Error?e.message:'Feed unavailable');}
      finally{if(!cancelled){setLoading(false);timer=setTimeout(poll,5000);}}
    };
    poll();return()=>{cancelled=true;controller.abort();clearTimeout(timer);};
  },[symbol,interval,refresh]);
  return <section role="dialog" aria-modal="true" aria-label={text('Liquidity Reader')} dir={dir} className="fixed inset-0 z-[110] overflow-y-auto bg-[#0B0F17] text-slate-200">
    <div className="max-w-6xl mx-auto p-4 sm:p-8">
      <header className="flex items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div><p className="text-amber-400 text-xs uppercase tracking-widest flex gap-2 items-center"><Activity size={16}/> {text('Market analysis')}</p><h1 className="text-2xl font-bold text-white mt-2">{text('Liquidity Reader')}</h1><p className="text-sm text-slate-400 mt-2">{text('Displayed orders where available. Transparent estimates everywhere else.')}</p></div>
        <button ref={closeRef} onClick={onClose} className="flex gap-2 items-center px-3 py-2 rounded-lg border border-slate-700"><ArrowLeft size={16} className={isRTL?'rotate-180':undefined}/> {text('Back')}</button>
      </header>
      <nav aria-label={text('Liquidity instruments')} className="flex flex-wrap gap-2 my-6">{options.map(([id,label])=><button key={id} aria-pressed={readerSymbol(id)===symbol} onClick={()=>setSymbol(readerSymbol(id))} className={`px-4 py-2 rounded-lg border text-sm ${readerSymbol(id)===symbol?'bg-amber-400 text-slate-950 border-amber-400':'border-slate-700 text-slate-300'}`}>{text(label)} <span dir="ltr" className="text-xs opacity-70">{id}</span></button>)}</nav>
      {error && <p role="alert" className="p-3 mb-4 rounded-lg border border-amber-600/40 text-amber-300">{liquidityError(error,language)}. {data?text('Last successful snapshot shown; updates unavailable.'):text('No liquidity values are fabricated when a feed is unavailable.')}</p>}
      {loading && <p role="status">{text('Loading market data…')}</p>}
      {data && <>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5"><div><span className={`text-xs px-2 py-1 rounded border ${data.kind==='book'?'text-emerald-300 border-emerald-800':'text-amber-300 border-amber-800'}`}>{data.kind==='book'?text('REAL ORDER BOOK'):text('CALCULATED / ESTIMATED')}</span><p className="text-xs text-slate-400 mt-3">{text(data.source)}</p></div><div className="text-xs text-slate-400 text-end">{text('Snapshot')} {new Date(data.observedAt).toLocaleTimeString(locale)}<br/>{text('Market timestamp')} {data.marketTime?new Date(data.marketTime).toLocaleString(locale):text('Unavailable')}{Date.now()-data.marketTime>(data.kind==='book'?60000:Math.max(600000,(data.intervalSeconds??300)*2000))&&<span className="block text-amber-400">{text('Market/feed inactive or delayed')}</span>}</div></div>
        <div className="grid sm:grid-cols-3 gap-4 mb-6">{[[text('Current reference price'),number(data.price)],[text('Liquidity imbalance'),data.imbalance===null?text('Not available from candles'):`${fixed(data.imbalance,1)}% ${text(data.imbalance>=0?'bid bias':'ask bias')}`],[text('Market pressure'),text(data.pressure)]].map(([title,value])=><div key={title} className="rounded-xl bg-[#111827] border border-slate-800 p-5"><p className="text-xs text-slate-400 mb-2">{title}</p><p className="text-lg font-semibold text-white">{value}</p></div>)}</div>
        <div className="grid lg:grid-cols-2 gap-5">
          <article className="border border-slate-800 rounded-xl p-5"><h2 className="font-semibold mb-4">{data.kind==='book'?text('Largest displayed price levels'):text('Nearby estimated liquidity levels')}</h2><div className="overflow-x-auto"><table className="w-full text-sm text-start"><thead className="text-xs text-slate-500"><tr><th className="pb-3">{text('Side / level')}</th><th>{text('Price')}</th><th>{data.kind==='book'?text('BTC size'):text('Distance')}</th></tr></thead><tbody>{data.levels.map((l,i)=><tr key={i} className="border-t border-slate-800"><td className={`py-3 ${l.side==='Bid'?'text-emerald-400':l.side==='Ask'?'text-rose-400':'text-slate-300'}`}>{text(l.side)}</td><td className="font-mono text-slate-200">{number(l.price)}</td><td className="font-mono text-slate-200">{data.kind==='book'?fixed(l.size,4):`${fixed((l.price/data.price-1)*100,2)}%`}</td></tr>)}</tbody></table></div></article>
          <article className="border border-slate-800 rounded-xl p-5"><h2 className="font-semibold mb-4">{data.kind==='book'?text('Executed market pressure'):text('Activity concentration (estimated)')}</h2>{data.kind==='book'?<div className="space-y-4 text-sm"><p>{text('Buyer-initiated')}: <span className="text-emerald-400">{number(data.buyVolume||0)} BTC</span></p><p>{text('Seller-initiated')}: <span className="text-rose-400">{number(data.sellVolume||0)} BTC</span></p><p className="text-slate-400">{text('Trade sample spans {seconds} seconds. Spread: {spread} USDT.',{seconds:fixed((data.tradeWindow||0)/1000,1),spread:number(data.spread||0)})}</p></div>:data.profile.map((l,i)=><div key={i} className="my-3"><div className="flex justify-between text-xs mb-1"><span>{number(l.price)}</span><span>{text('{percent}% of shown activity',{percent:fixed(100*l.size/data.profile.reduce((s,p)=>s+p.size,0),1)})}</span></div><div className="h-2 bg-slate-800 rounded"><div className="h-2 rounded bg-blue-500/70" style={{width:`${100*l.size/data.profile[0].size}%`}}/></div></div>)}<div className="mt-5 pt-4 border-t border-slate-800 text-sm space-y-3"><p><span className="text-slate-500">{text('Sweep')}: </span>{text(data.sweep)}</p><p><span className="text-slate-500">{text('Absorption')}: </span>{text(data.absorption)}</p></div></article>
        </div>
        <aside className="mt-6 p-5 rounded-xl bg-slate-900/60 text-xs text-slate-400 space-y-2"><h2 className="font-semibold text-slate-200">{text('Data and methodology')}</h2>{data.notes.map(n=><p key={n}>{text(n)}</p>)}</aside>
      </>}
      <button onClick={()=>setRefresh(v=>v+1)} disabled={loading} className="mt-5 flex items-center gap-2 text-sm text-slate-400 disabled:opacity-40"><RefreshCw size={14}/> {text('Refresh data')}</button>
    </div>
  </section>;
}
