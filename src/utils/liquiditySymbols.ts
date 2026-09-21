import {resolveRealtimeTvSymbol} from '../../server/services/marketProviders';

/** Reader-only aliases: never rewrite chart identifiers or stored drawings. */
export function liquiditySymbol(input:string):string {
  const upper=input.trim().toUpperCase();
  const prefix=upper.includes(':')?upper.split(':')[0]:'';
  const ticker=(prefix?upper.slice(prefix.length+1):upper).replace(/[_/]/g,'');
  if(prefix&&!['OANDA','BINANCE'].includes(prefix))throw new Error('Unsupported liquidity instrument');
  if(/^(BTC|BTCUSD|BTCUSDT|BITCOIN)$/.test(ticker))return 'BINANCE:BTCUSDT';
  if(prefix==='BINANCE')throw new Error('Unsupported liquidity instrument');
  const aliases:Record<string,string>={WTI:'WTICOUSD',OIL:'WTICOUSD',SILVER:'XAGUSD',US100USD:'NAS100USD',US500USD:'SPX500USD',DE40EUR:'DE30EUR'};
  const value=aliases[ticker]||ticker;
  try {return resolveRealtimeTvSymbol(prefix==='OANDA'||/^(WTICOUSD|BCOUSD|XAGUSD)$/.test(value)?'OANDA:'+value:value);}
  catch {throw new Error('Unsupported liquidity instrument');}
}
export function liquidityInterval(input='5'):{interval:string;seconds:number} {
  const aliases:Record<string,string>={'1m':'1','5m':'5','15m':'15','30m':'30','1h':'60','2h':'120','4h':'240','d':'1D','1d':'1D','w':'1W','1w':'1W'};
  const interval=aliases[input.toLowerCase()]||input;
  const seconds:Record<string,number>={'1':60,'5':300,'15':900,'30':1800,'60':3600,'120':7200,'240':14400,'1D':86400,'1W':604800};
  if(!seconds[interval])throw new Error('Unsupported liquidity timeframe');
  return {interval,seconds:seconds[interval]};
}
