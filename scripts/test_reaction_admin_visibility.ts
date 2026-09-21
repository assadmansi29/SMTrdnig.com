import assert from 'node:assert/strict';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import reactionRoutes from '../server/routes/reactionRoutes';
import {reactionAuthority} from '../server/services/reactionAuthority';
import {visibleReactionSnapshot} from '../server/services/reactionSignalVisibility';
import {Database} from '../server/db';
import {getJwtSecret} from '../server/auth';
import {connectReactionAuthority,getReactionTrades} from '../src/components/chart/reactionZoneTrades';

const tests=['test','test2','break','retest'].map((type,i)=>({id:'test-'+i,type,direction:'neutral'}));
const entries=['buy_bounce','sell_rejection','buy_breakout','sell_breakdown'].map((type,i)=>({id:'entry-'+i,type,entryPrice:2300}));
const state:any={epoch:'test',sequence:1,serverTime:Date.now(),trades:[{id:'private-trade',entry:2300}],events:[...tests,...entries].map(signal=>({id:signal.id,signal})),evaluations:{
  pending:{state:'TEST_2',activeSignal:tests[1],signals:[...tests,...entries]},
  confirmed:{state:'CONFIRMED_BUY',activeSignal:entries[0],signals:entries},
}};
const original=JSON.stringify(state);
const publicState=visibleReactionSnapshot(state,false);
assert.deepEqual(publicState.trades,[]);
assert.equal(publicState.evaluations.confirmed,null);
assert.deepEqual(publicState.evaluations.pending!.signals,tests);
assert.equal(publicState.evaluations.pending!.activeSignal?.type,'test2');
assert.equal(publicState.events.length,4);
assert.equal(visibleReactionSnapshot(state,true),state);
assert.equal(JSON.stringify(state),original,'visibility must not mutate engine state');

// Isolated HTTP/auth checks: fake user lookup, no database connection or writes.
const realLookup=Database.findUserById,realSnapshot=reactionAuthority.snapshot;
Database.findUserById=async(id:string)=>({id,role:id,username:id} as any);
reactionAuthority.snapshot=()=>state;
const app=express();app.use(cookieParser());app.use('/api/reactions',reactionRoutes);
const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
const base=`http://127.0.0.1:${(server.address() as any).port}/api/reactions`;
try {
  assert.equal((await fetch(base+'/snapshot?admin=1')).status,401);
  for(const role of ['client','coach','employee','admin','super_admin']) {
    const token=jwt.sign({id:role},getJwtSecret(),{expiresIn:'1m'});
    const headers={Cookie:`auth_token=${token}`};
    const response=await fetch(base+'/snapshot?admin=1',{headers});
    const isAdmin=role==='admin'||role==='super_admin';
    assert.equal(response.status,isAdmin?200:403,role);
    if(isAdmin)assert.deepEqual(await response.json(),state);
    const publicResponse=await fetch(base+'/snapshot',{headers});
    assert.deepEqual(await publicResponse.json(),publicState,'public mode always redacts entries');
  }
  for(const admin of [false,true]) {
    const token=jwt.sign({id:'admin'},getJwtSecret(),{expiresIn:'1m'});
    const response=await fetch(base+'/stream'+(admin?'?admin=1':''),{headers:admin?{Cookie:`auth_token=${token}`}:{}});
    const reader=response.body!.getReader();const {value}=await reader.read();
    const data=new TextDecoder().decode(value).split('\n').find(line=>line.startsWith('data: '))!.slice(6);
    assert.deepEqual(JSON.parse(data),admin?state:publicState);
    await reader.cancel();
  }
  console.log('PASS public snapshot/SSE redaction; client/coach/employee denied; Admin/Super Admin authorized; TEST stages and engine state unchanged');
}finally{Database.findUserById=realLookup;reactionAuthority.snapshot=realSnapshot;server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}

const connections:any[]=[];
const oldSource=globalThis.EventSource,oldDocument=globalThis.document;
(globalThis as any).EventSource=class {onmessage:any;onopen:any;constructor(public url:string){connections.push(this);}close(){}};
(globalThis as any).document={addEventListener(){},removeEventListener(){}};
try {
  const stopAdmin=connectReactionAuthority(true);
  assert.ok(connections[0].url.endsWith('?admin=1'));
  connections[0].onmessage({data:JSON.stringify(state)});
  assert.equal(getReactionTrades().length,1);
  stopAdmin();assert.equal(getReactionTrades().length,0);
  const stopClient=connectReactionAuthority(false);
  connections[0].onmessage({data:JSON.stringify({...state,sequence:2})});
  assert.equal(getReactionTrades().length,0,'late admin stream cannot restore private data after logout');
  connections[1].onmessage({data:JSON.stringify(publicState)});
  assert.equal(getReactionTrades().length,0);stopClient();
  console.log('PASS role-switch cleanup and late administrator-stream suppression');
}finally{(globalThis as any).EventSource=oldSource;(globalThis as any).document=oldDocument;}
