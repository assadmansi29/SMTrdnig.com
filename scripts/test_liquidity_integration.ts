import assert from 'node:assert/strict';
import {liquiditySymbol,liquidityInterval} from '../src/utils/liquiditySymbols';
import {createLiquidityCandleReader} from '../server/services/liquidityCandleReader';
import {getLiquidityChartContext,publishLiquidityChartContext,subscribeLiquidityChartContext} from '../src/services/liquidityChartContext';
import {analyzeCandles} from '../src/utils/liquidityAnalysis';
for(const [input,expected] of [
 ['XAU_USD','OANDA:XAUUSD'],['OANDA:EUR_USD','OANDA:EURUSD'],['GBP/USD','OANDA:GBPUSD'],['USD_JPY','OANDA:USDJPY'],
 ['NASDAQ','OANDA:NAS100USD'],['NAS100_USD','OANDA:NAS100USD'],['US30_USD','OANDA:US30USD'],['GER40','OANDA:DE30EUR'],
 ['OANDA:SPX500_USD','OANDA:SPX500USD'],['WTI','OANDA:WTICOUSD'],['XAG_USD','OANDA:XAGUSD'],
 ['BTC','BINANCE:BTCUSDT'],['BINANCE:BTCUSDT','BINANCE:BTCUSDT'],['BTC_USD','BINANCE:BTCUSDT']])assert.equal(liquiditySymbol(input),expected);
for(const input of ['BINANCE:ETHUSDT','FXCM:XAUUSD','ETHUSD'])assert.throws(()=>liquiditySymbol(input));
assert.equal(liquidityInterval('1h').interval,'60');assert.equal(liquidityInterval('1D').seconds,86400);assert.throws(()=>liquidityInterval('invalid'));
let now=1800000300000,calls:string[]=[],fail=false;
const original=Array.from({length:25},(_,i)=>({time:1800000000-(24-i)*60,open:1.1,high:1.101,low:1.099,close:1.1005}));
const before=JSON.stringify(original);
let quote={price:1.102,time:now/1000};
const read=createLiquidityCandleReader({now:()=>now,history:async(symbol,interval)=>{
 calls.push(symbol+interval);if(fail)throw new Error('offline');return original;
},liveBars:(_s,_i,bars)=>bars,quote:()=>quote});
const reports=await Promise.all([read('OANDA:EURUSD','1'),read('OANDA:EURUSD','1')]);
assert.equal(calls.length,1,'concurrent history requests coalesce');
for(const report of reports){assert.equal(report.kind,'estimated');assert.equal(report.price,quote.price);assert.equal(report.marketTime,now);assert.equal(report.priceDecimals,5);assert.equal(report.imbalance,null);assert.ok(report.levels.length>=2);assert.ok(report.profile.length);}
assert.equal(JSON.stringify(original),before,'never mutate broker/chart candles');
await read('OANDA:EURUSD','5');assert.equal(calls.length,2,'timeframe owns independent cache');
await read('OANDA:GBPUSD','1');assert.equal(calls.length,3,'symbol owns independent cache');
quote={price:9,time:now/1000-60};const stale=await read('OANDA:EURUSD','1');assert.equal(stale.price,1.1005,'stale quote excluded');
now+=31000;fail=true;assert.ok((await read('OANDA:EURUSD','1')).profile.length,'retain genuine history during outage');
const owner={},modal={};let changes=0;const off=subscribeLiquidityChartContext(()=>changes++);
const close=publishLiquidityChartContext(owner,{symbol:'OANDA:EURUSD',interval:'1'});
const closeModal=publishLiquidityChartContext(modal,{symbol:'OANDA:GBPUSD',interval:'5'});
assert.equal(getLiquidityChartContext()?.symbol,'OANDA:GBPUSD');closeModal();assert.equal(getLiquidityChartContext()?.interval,'1');close();off();assert.equal(getLiquidityChartContext(),null);assert.equal(changes,4);
const bars=Array.from({length:25},(_,i)=>({time:1800000000+i*60,open:100,high:102,low:98,close:101}));bars[24].high=105;
assert.match(analyzeCandles(bars,(bars[24].time+60)*1000,60).sweep,/Upper range/);
assert.match(analyzeCandles(bars,(bars[24].time+60)*1000,300).sweep,/No closed/,'no hard-coded five-minute close logic');
console.log('PASS provider aliases, BTC-only Binance, timeframe normalization, shared history, cache separation, live quote overlay, stale quote rejection, immutable chart data, chart selection bridge and timeframe-aware closed candles');
