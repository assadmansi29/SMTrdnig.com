import {Router} from 'express';
import {authenticateToken, type AuthRequest} from '../auth';
import {reactionAuthority} from '../services/reactionAuthority';
import {visibleReactionSnapshot} from '../services/reactionSignalVisibility';

const router=Router();
router.use((_req,res,next)=>{res.setHeader('Cache-Control','no-store, no-transform');next();});
router.use((req:AuthRequest,res,next)=>{
  if(req.query.admin!=='1'){next();return;}
  return authenticateToken(req,res,()=>{
    if(!['admin','super_admin'].includes(req.user?.role||'')){res.status(403).json({error:'Admin test signals only'});return;}
    next();
  });
});
const canViewEntries=(req:AuthRequest)=>req.query.admin==='1'&&['admin','super_admin'].includes(req.user?.role||'');
router.get('/snapshot',(req:AuthRequest,res)=>res.json(visibleReactionSnapshot(reactionAuthority.snapshot(),canViewEntries(req))));
router.get('/stream',(req:AuthRequest,res)=>{
  res.setHeader('Content-Type','text/event-stream');
  res.setHeader('X-Accel-Buffering','no');
  res.flushHeaders();
  const send=(snapshot:ReturnType<typeof reactionAuthority.snapshot>)=>{
    // Reconnect to a current snapshot instead of queuing minutes of obsolete states.
    if(res.writableLength>262144){res.destroy();return;}
    res.write(`id: ${snapshot.epoch}:${snapshot.sequence}\ndata: ${JSON.stringify(visibleReactionSnapshot(snapshot,canViewEntries(req)))}\n\n`);
  };
  const unsubscribe=reactionAuthority.subscribe(send);
  send(reactionAuthority.snapshot());
  const heartbeat=setInterval(()=>res.write(`: heartbeat\n\n`),15000);
  req.once('close',()=>{clearInterval(heartbeat);unsubscribe();});
});
router.post('/clear',authenticateToken,(req:AuthRequest,res)=>{
  if(!['admin','super_admin'].includes(req.user?.role||'')) {res.status(403).json({error:'Forbidden'});return;}
  if(typeof req.body.id!=='string'){res.status(400).json({error:'Trade id required'});return;}
  reactionAuthority.clear(req.body.id);
  res.json({status:'ok'});
});
export default router;
