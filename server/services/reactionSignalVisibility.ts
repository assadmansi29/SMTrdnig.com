import type {ReactionAuthority} from './reactionAuthority';

type Snapshot=ReturnType<ReactionAuthority['snapshot']>;
const entryTypes=new Set(['buy_bounce','sell_rejection','buy_breakout','sell_breakdown']);
const isEntry=(signal:any)=>signal && (entryTypes.has(signal.type)||signal.entryPrice!=null);

/** Admin-only test mode changes distribution, never the signal engine. */
export function visibleReactionSnapshot(snapshot:Snapshot,isAdmin:boolean):Snapshot {
  if(isAdmin)return snapshot;
  return {
    ...snapshot,
    trades:[],
    events:snapshot.events.filter(event=>!isEntry(event.signal)),
    evaluations:Object.fromEntries(Object.entries(snapshot.evaluations).map(([key,value])=>[
      key,!value||value.state==='CONFIRMED_BUY'||value.state==='CONFIRMED_SELL'?null:{
        ...value,
        activeSignal:isEntry(value.activeSignal)?null:value.activeSignal,
        signals:value.signals.filter(signal=>!isEntry(signal)),
      },
    ])),
  };
}
