// Read-only chart selection bridge. No drawing, strategy or market state writes.
export interface LiquidityChartContext {symbol:string;interval:string}
const charts=new Map<object,LiquidityChartContext>();
const listeners=new Set<()=>void>();
let current:LiquidityChartContext|null=null;
export const getLiquidityChartContext=()=>current;
export const subscribeLiquidityChartContext=(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};};
export function publishLiquidityChartContext(owner:object,context:LiquidityChartContext) {
  charts.delete(owner);charts.set(owner,context);current=context;listeners.forEach(fn=>fn());
  return()=>{charts.delete(owner);current=[...charts.values()].at(-1)??null;listeners.forEach(fn=>fn());};
}
