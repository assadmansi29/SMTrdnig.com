import assert from 'node:assert/strict';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import reactionRoutes from '../server/routes/reactionRoutes';
import drawingRoutes from '../server/routes/chartDrawingsRoutes';
import storageRoutes from '../server/routes/tradingviewStorageRoutes';
import analysisRoutes from '../server/routes/chartAnalysisRoutes';
import {reactionAuthority} from '../server/services/reactionAuthority';
import {visibleReactionSnapshot} from '../server/services/reactionSignalVisibility';
import {Database} from '../server/db';
import {getJwtSecret} from '../server/auth';
import {connectReactionAuthority,getReactionTrades} from '../src/components/chart/reactionZoneTrades';
const tests=['test','test2','break','retest'].map((type,i)=>({id:'test-'+i,type,direction:'neutral'}));
const entries=['buy_bounce','sell_rejection','buy_breakout','sell_breakdown'].map((type,i)=>({id:'entry-'+i,type,entryPrice:2300}));
const state:any={epoch:'test',sequence:1,serverTime:Date.now(),trades:[{id:'shared-trade',entry:2300,stop:2297.5,tp1:2303.5,tp2:2307}],events:[...tests,...entries].map(signal=>({id:signal.id,signal})),evaluations:{pending:{state:'TEST_2',activeSignal:tests[1],signals:[...tests,...entries]},confirmed:{state:'CONFIRMED_BUY',activeSignal:entries[0],signals:entries}}};
const original=JSON.stringify(state);
assert.equal(visibleReactionSnapshot(state,false),state);assert.equal(visibleReactionSnapshot(state,true),state);
const lookup=Database.findUserById,snapshot=reactionAuthority.snapshot,clear=reactionAuthority.clear;let clears=0;
Database.findUserById=async(id:string)=>({id,role:id,username:'abuasad2299',email:'am29multibrand@gmail.com',permissions:{canManageContent:true}} as any);
reactionAuthority.snapshot=()=>state;reactionAuthority.clear=()=>{clears++;};
const app=express();app.use(express.json(),cookieParser());app.use('/reactions',reactionRoutes);app.use('/drawings',drawingRoutes);app.use('/storage',storageRoutes);app.use('/analyses',analysisRoutes);
const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const base=`http://127.0.0.1:${(server.address() as any).port}`;
try {
 for(const role of ['visitor','client','coach','employee','admin','super_admin']) {
  const headers:Record<string,string>={'Content-Type':'application/json'};
  if(role!=='visitor')headers.Cookie=`auth_token=${jwt.sign({id:role},getJwtSecret(),{expiresIn:'1m'})}`;
  for(const query of ['', '?admin=1'])assert.deepEqual(await (await fetch(base+'/reactions/snapshot'+query,{headers})).json(),state,role+' sees full snapshot');
  const stream=await fetch(base+'/reactions/stream',{headers}),reader=stream.body!.getReader();const {value}=await reader.read();
  assert.deepEqual(JSON.parse(new TextDecoder().decode(value).split('\n').find(l=>l.startsWith('data: '))!.slice(6)),state,role+' sees full live stream');await reader.cancel();
  const admin=['admin','super_admin'].includes(role),denied=role==='visitor'?401:403;
  const post=async(path:string,body:any={})=>(await fetch(base+path,{method:'POST',headers,body:JSON.stringify(body)})).status;
  assert.equal(await post('/reactions/clear',{id:'fixture'}),admin?200:denied);
  assert.equal(await post('/storage/1.1/drawings'),admin?200:denied);
  assert.equal(await post('/analyses'),admin?400:denied);
  if(!admin) {
   for(const path of ['/drawings/batch','/drawings/delete-strategy','/drawings','/storage/1.1/charts','/storage/1.1/study_templates'])assert.equal(await post(path),denied,role+' cannot write '+path);
   for(const path of ['/drawings/fixture','/storage/1.1/charts','/analyses/fixture'])assert.equal((await fetch(base+path,{method:'DELETE',headers})).status,denied);
  }
 }
 assert.equal(clears,2);assert.equal(JSON.stringify(state),original);
 console.log('PASS visitor/client/coach/employee/Admin/Super Admin receive identical full snapshot and SSE; only Admin/Super Admin may modify signals, drawings, charts and analyses (including legacy identity exceptions). No database connection or writes.');
} finally {Database.findUserById=lookup;reactionAuthority.snapshot=snapshot;reactionAuthority.clear=clear;server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
const connections:any[]=[],oldSource=globalThis.EventSource,oldDocument=globalThis.document;
(globalThis as any).EventSource=class{onmessage:any;onopen:any;constructor(public url:string){connections.push(this);}close(){}};
(globalThis as any).document={addEventListener(){},removeEventListener(){}};
try {
 const stop=connectReactionAuthority(false);assert.equal(connections[0].url,'/api/reactions/stream');connections[0].onmessage({data:JSON.stringify(state)});assert.equal(getReactionTrades().length,1);stop();
 const stopNext=connectReactionAuthority(true);assert.equal(connections[1].url,'/api/reactions/stream');connections[0].onmessage({data:JSON.stringify({...state,sequence:2})});assert.equal(getReactionTrades().length,0);
 connections[1].onmessage({data:JSON.stringify(state)});assert.equal(getReactionTrades().length,1);stopNext();
 console.log('PASS common public subscription, cleanup and stale connection suppression');
}finally{(globalThis as any).EventSource=oldSource;(globalThis as any).document=oldDocument;}
