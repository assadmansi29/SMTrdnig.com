import assert from 'node:assert/strict';
import {BiquoteService} from '../server/services/biquoteService';
const realFetch=globalThis.fetch;
const sample={id:'test:1',name:'CPI',countryCode:'US',currency:'USD',time:'2026-09-21T12:30:00Z',importance:'low',actual:0,forecast:1,previous:2,unit:'percent'};
try {
  globalThis.fetch=async input=>{
    if(String(input).includes('upcoming'))throw new Error('One feed unavailable');
    return new Response(JSON.stringify([sample,{...sample,id:'invalid',time:'not-a-date'},{...sample,id:'ambiguous',time:'2026-09-21T12:30:00'}]),{status:200});
  };
  const result=await new BiquoteService().fetchCalendar();
  assert.equal(result.length,1);
  assert.equal(result[0].dateUtc,'2026-09-21T12:30:00.000Z');
  assert.equal(result[0].importance,1);
  assert.equal(result[0].actual,'0%');
  globalThis.fetch=async()=>new Response('[]',{status:200});
  await assert.rejects(new BiquoteService().fetchCalendar());
  console.log('PASS calendar provider: partial outage, deduplication, invalid/ambiguous timestamp rejection, zero actual, provider impact, empty feed failure');
}finally{globalThis.fetch=realFetch;}
