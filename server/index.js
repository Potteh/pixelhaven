import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import {Server} from 'socket.io';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const {Pool}=pg;
const pool=new Pool({connectionString:process.env.DATABASE_URL});
const secret=process.env.JWT_SECRET;
if(!secret || secret.length<32) throw new Error('JWT_SECRET must contain at least 32 characters');
const app=express(), http=createServer(app), io=new Server(http,{maxHttpBufferSize:12000});
app.use(helmet({contentSecurityPolicy:false}));app.use(express.json({limit:'12kb'}));
app.use('/api',rateLimit({windowMs:15*60*1000,limit:120,standardHeaders:'draft-7',legacyHeaders:false}));
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../web');
app.use(express.static(root));
const CATALOG={chair:35,sofa:95,table:65,plant:40,lamp:45,bed:120,arcade:160};
const safe=(s,max=240)=>String(s??'').trim().slice(0,max);
const token=u=>jwt.sign({id:u.id},secret,{expiresIn:'7d'});
const getUser=async id=>(await pool.query('SELECT id,username,coins,role,avatar FROM users WHERE id=$1',[id])).rows[0];
const auth=async(req,res,next)=>{try{const t=(req.headers.authorization||'').replace(/^Bearer /,'');const p=jwt.verify(t,secret);req.user=await getUser(p.id);if(!req.user)return res.status(401).json({error:'Unauthorized'});next();}catch{return res.status(401).json({error:'Unauthorized'});}};
const fail=(res,e)=>{console.error(e);res.status(500).json({error:'Server error'});};
app.post('/api/register',async(req,res)=>{try{const username=safe(req.body.username,24),password=String(req.body.password||'');if(!/^[a-zA-Z0-9_]{3,24}$/.test(username)||password.length<8||password.length>128)return res.status(400).json({error:'Username: 3-24 letters/numbers/underscores; password: 8-128 characters'});const hash=await bcrypt.hash(password,12);const r=await pool.query('INSERT INTO users(username,password_hash) VALUES($1,$2) RETURNING id',[username,hash]);res.json({token:token(r.rows[0]),user:await getUser(r.rows[0].id)});}catch(e){if(e.code==='23505')return res.status(409).json({error:'Username already exists'});fail(res,e);}});
app.post('/api/login',async(req,res)=>{try{const r=await pool.query('SELECT * FROM users WHERE lower(username)=lower($1)',[safe(req.body.username,24)]);const u=r.rows[0];if(!u||!await bcrypt.compare(String(req.body.password||''),u.password_hash))return res.status(401).json({error:'Invalid credentials'});const ban=await pool.query('SELECT 1 FROM bans WHERE user_id=$1 AND (expires_at IS NULL OR expires_at>now())',[u.id]);if(ban.rowCount)return res.status(403).json({error:'Account suspended'});res.json({token:token(u),user:await getUser(u.id)});}catch(e){fail(res,e);}});
app.get('/api/me',auth,(req,res)=>res.json(req.user));
app.patch('/api/avatar',auth,async(req,res)=>{
 try{
  const a=req.body;
  const colors=['#e8ad7d','#a96b46','#f2cba5','#6d4535','#4b86e8','#ef7d82','#72c49a','#9b7de5','#493323','#1c2535','#f5ca59','#ffffff'];
  const options={hairstyle:['short','spiky','long','buzz','sidepart'],face:['smile','neutral','happy','wink'],outfit:['tee','hoodie','jacket','sweater','vest','dress'],accessory:['none','glasses','cap','headphones','beanie','sunglasses'],pants:['jeans','chinos','shorts','skirt'],shoes:['sneakers','boots','loafers'],pantsColor:colors,shoeColor:colors};
  if(!a||!['skin','shirt','hair'].every(k=>colors.includes(a[k]))||Object.entries(options).some(([k,values])=>a[k]!==undefined&&!values.includes(a[k])))return res.status(400).json({error:'Invalid avatar options'});
  const avatar=Object.fromEntries([...['skin','shirt','hair'].map(k=>[k,a[k]]),...Object.entries(options).map(([k,values])=>[k,a[k]||({pants:'jeans',shoes:'sneakers',pantsColor:'#4b86e8',shoeColor:'#1c2535'}[k]||values[0])])]);
  await pool.query('UPDATE users SET avatar=$1 WHERE id=$2',[JSON.stringify(avatar),req.user.id]);
  const user=await getUser(req.user.id);req.user.avatar=user.avatar;
  for(const socket of io.sockets.sockets.values())if(socket.data.user?.id===req.user.id){
    socket.data.user.avatar=user.avatar;
    if(socket.data.roomId)io.to('room:'+socket.data.roomId).emit('player:avatar',{socketId:socket.id,avatar:user.avatar});
  }
  res.json(user);
 }catch(e){fail(res,e)}
});
app.get('/api/rooms',auth,async(req,res)=>{try{res.json((await pool.query('SELECT r.id,r.name,r.description,r.owner_id,r.is_public,u.username AS owner FROM rooms r LEFT JOIN users u ON u.id=r.owner_id WHERE r.is_public OR r.owner_id=$1 ORDER BY r.id LIMIT 100',[req.user.id])).rows);}catch(e){fail(res,e);}});
app.post('/api/rooms',auth,async(req,res)=>{try{const name=safe(req.body.name,64);if(name.length<3)return res.status(400).json({error:'Room name too short'});const count=await pool.query('SELECT count(*)::int AS n FROM rooms WHERE owner_id=$1',[req.user.id]);if(count.rows[0].n>=10)return res.status(400).json({error:'Room limit reached'});const r=await pool.query('INSERT INTO rooms(owner_id,name,description,is_public) VALUES($1,$2,$3,$4) RETURNING *',[req.user.id,name,safe(req.body.description,240),req.body.is_public!==false]);res.json(r.rows[0]);}catch(e){fail(res,e);}});
app.get('/api/catalog',auth,(_req,res)=>res.json(CATALOG));
app.get('/api/inventory',auth,async(req,res)=>{try{res.json((await pool.query('SELECT kind,quantity FROM inventory WHERE user_id=$1',[req.user.id])).rows);}catch(e){fail(res,e);}});
app.post('/api/buy',auth,async(req,res)=>{const kind=safe(req.body.kind,30),price=CATALOG[kind];if(!price)return res.status(400).json({error:'Unknown item'});const client=await pool.connect();try{await client.query('BEGIN');const r=await client.query('UPDATE users SET coins=coins-$1 WHERE id=$2 AND coins >= $1 RETURNING coins',[price,req.user.id]);if(!r.rowCount){await client.query('ROLLBACK');return res.status(400).json({error:'Not enough coins'});}await client.query('INSERT INTO inventory(user_id,kind,quantity) VALUES($1,$2,1) ON CONFLICT(user_id,kind) DO UPDATE SET quantity=inventory.quantity+1',[req.user.id,kind]);await client.query('COMMIT');res.json({coins:r.rows[0].coins});}catch(e){await client.query('ROLLBACK');fail(res,e);}finally{client.release();}});
app.post('/api/mod/ban',auth,async(req,res)=>{try{if(req.user.role!=='admin')return res.sendStatus(403);const id=Number(req.body.userId);if(!Number.isInteger(id)||id===req.user.id)return res.status(400).json({error:'Invalid target'});await pool.query('INSERT INTO bans(user_id,reason) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET reason=$2,expires_at=NULL',[id,safe(req.body.reason,240)]);for(const s of io.sockets.sockets.values())if(s.data.user?.id===id)s.disconnect(true);res.json({ok:true});}catch(e){fail(res,e);}});
const occupants=new Map();const positions=new Map();const poses=new Map();
const occupantsFor=id=>[...(occupants.get(id)||new Set())].map(sid=>{const s=io.sockets.sockets.get(sid);return s?{socketId:sid,user:s.data.user,x:positions.get(sid)?.x??4,y:positions.get(sid)?.y??4,pose:poses.get(sid)||null}:null}).filter(Boolean);
const leave=s=>{const id=s.data.roomId;if(!id)return;occupants.get(id)?.delete(s.id);positions.delete(s.id);poses.delete(s.id);s.leave(`room:${id}`);io.to(`room:${id}`).emit('player:left',s.id);s.data.roomId=null;};
io.use(async(socket,next)=>{try{const p=jwt.verify(socket.handshake.auth.token,secret);const u=await getUser(p.id);if(!u)return next(new Error('Unauthorized'));const b=await pool.query('SELECT 1 FROM bans WHERE user_id=$1 AND (expires_at IS NULL OR expires_at>now())',[u.id]);if(b.rowCount)return next(new Error('Suspended'));socket.data.user=u;next();}catch{next(new Error('Unauthorized'));}});
io.on('connection',s=>{let lastChat=0,lastMove=0;
 s.on('room:join',async(id,ack=()=>{})=>{try{id=Number(id);if(!Number.isInteger(id))return ack({error:'Invalid room'});const r=await pool.query('SELECT * FROM rooms WHERE id=$1 AND (is_public OR owner_id=$2)',[id,s.data.user.id]);if(!r.rowCount)return ack({error:'Room unavailable'});leave(s);s.join(`room:${id}`);s.data.roomId=id;if(!occupants.has(id))occupants.set(id,new Set());occupants.get(id).add(s.id);positions.set(s.id,{x:4,y:4});poses.delete(s.id);const furn=(await pool.query('SELECT id,kind,x,y,rotation FROM furniture WHERE room_id=$1 ORDER BY id',[id])).rows;const messages=(await pool.query('SELECT m.body,m.created_at,u.username FROM messages m JOIN users u ON u.id=m.user_id WHERE room_id=$1 ORDER BY m.id DESC LIMIT 30',[id])).rows.reverse();ack({room:r.rows[0],furniture:furn,players:occupantsFor(id),messages});s.to(`room:${id}`).emit('player:joined',{socketId:s.id,user:s.data.user,x:4,y:4});}catch(e){console.error(e);ack({error:'Join failed'});}});
 // Server-authoritative tile walking: one adjacent tile every 240 ms.
 // A new click cancels the previous route; players cannot teleport by sending coordinates.
 let walkTimer=null;
 const stopWalking=()=>{if(walkTimer){clearInterval(walkTimer);walkTimer=null;}};
 s.on('player:move',async({x,y}={})=>{
   const now=Date.now();if(now-lastMove<100)return;lastMove=now;
   x=Number(x);y=Number(y);
   if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>9||y>9||!s.data.roomId)return;
   stopWalking();
   if(poses.has(s.id)){poses.delete(s.id);io.to('room:'+s.data.roomId).emit('player:pose',{socketId:s.id,pose:null});}
   const roomId=s.data.roomId;
   const current=positions.get(s.id);if(!current)return;
   // Orthogonal grid routing around persisted furniture. Decorative lobby art
   // remains visual-only until it has corresponding collision footprints.
   let blocked=new Set();
   try{
     const rows=(await pool.query('SELECT x,y FROM furniture WHERE room_id=$1',[roomId])).rows;
     blocked=new Set(rows.map(p=>p.x+','+p.y));
   }catch(e){console.error('Path query failed',e);return;}
   if(s.data.roomId!==roomId)return;
   blocked.delete(current.x+','+current.y);
   if(blocked.has(x+','+y))return;
   const start=current.x+','+current.y,goal=x+','+y;
   const queue=[{x:current.x,y:current.y}],seen=new Set([start]),parent=new Map();
   for(let i=0;i<queue.length;i++){
     const p=queue[i],key=p.x+','+p.y;
     if(key===goal)break;
     for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
       const nx=p.x+dx,ny=p.y+dy,k=nx+','+ny;
       if(nx<0||ny<0||nx>9||ny>9||seen.has(k)||blocked.has(k))continue;
       seen.add(k);parent.set(k,key);queue.push({x:nx,y:ny});
     }
   }
   if(!seen.has(goal))return;
   const path=[];let key=goal;
   while(key!==start){const [px,py]=key.split(',').map(Number);path.unshift({x:px,y:py});key=parent.get(key);}
   let index=0;
   const step=()=>{
     if(s.data.roomId!==roomId||!s.connected){stopWalking();return;}
     const next=path[index++];if(!next){stopWalking();return;}
     positions.set(s.id,next);
     io.to('room:'+roomId).emit('player:moved',{socketId:s.id,x:next.x,y:next.y});
     if(index>=path.length)stopWalking();
   };
   if(path.length){walkTimer=setInterval(step,240);step();}
 });
 s.on('disconnecting',stopWalking);
 s.on('room:join',stopWalking);
 s.on('player:sit',async(itemId,ack=()=>{})=>{
   const roomId=s.data.roomId;if(!roomId)return ack({error:'Join a room first'});
   const item=(await pool.query("SELECT id,kind,x,y FROM furniture WHERE id=$1 AND room_id=$2",[Number(itemId),roomId])).rows[0];
   if(!item||!['chair','sofa','bed'].includes(item.kind))return ack({error:'Not a seat'});
   if([...poses.entries()].some(([sid,pose])=>sid!==s.id&&pose?.seatId===item.id))return ack({error:'Seat occupied'});
   stopWalking();
   positions.set(s.id,{x:item.x,y:item.y});
   const pose={type:'sit',seatId:item.id,kind:item.kind};
   poses.set(s.id,pose);
   io.to('room:'+roomId).emit('player:moved',{socketId:s.id,x:item.x,y:item.y});
   io.to('room:'+roomId).emit('player:pose',{socketId:s.id,pose});
   ack({ok:true});
 });
 s.on('player:stand',(_,ack=()=>{})=>{if(!s.data.roomId)return ack({error:'Not in a room'});poses.delete(s.id);io.to('room:'+s.data.roomId).emit('player:pose',{socketId:s.id,pose:null});ack({ok:true})});
 let lastEmote=0;
 s.on('player:emote',(name,ack=()=>{})=>{
   if(!s.data.roomId||!['wave','dance','laugh','cheer'].includes(name))return ack({error:'Invalid emote'});
   if(Date.now()-lastEmote<800)return ack({error:'Wait a moment'});
   lastEmote=Date.now();io.to('room:'+s.data.roomId).emit('player:emote',{socketId:s.id,name,until:Date.now()+3500});ack({ok:true});
 });
 s.on('chat:send',async(body,ack=()=>{})=>{try{const now=Date.now();if(now-lastChat<900)return ack({error:'Slow down'});lastChat=now;body=safe(body,240);if(!body||!s.data.roomId)return ack({error:'Cannot send'});await pool.query('INSERT INTO messages(room_id,user_id,body) VALUES($1,$2,$3)',[s.data.roomId,s.data.user.id,body]);io.to(`room:${s.data.roomId}`).emit('chat:message',{username:s.data.user.username,userId:s.data.user.id,body,socketId:s.id});ack({ok:true});}catch(e){console.error(e);ack({error:'Chat failed'});}});
 s.on('furniture:place',async({kind,x,y}={},ack=()=>{})=>{const id=s.data.roomId;kind=safe(kind,30);x=Number(x);y=Number(y);if(!id||!CATALOG[kind]||!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>9||y>9)return ack({error:'Invalid placement'});const client=await pool.connect();try{await client.query('BEGIN');const owner=await client.query('SELECT owner_id FROM rooms WHERE id=$1',[id]);if(owner.rows[0]?.owner_id!==s.data.user.id){await client.query('ROLLBACK');return ack({error:'Only room owner can decorate'});}const occ=await client.query('SELECT 1 FROM furniture WHERE room_id=$1 AND x=$2 AND y=$3',[id,x,y]);if(occ.rowCount){await client.query('ROLLBACK');return ack({error:'Tile occupied'});}const inv=await client.query('UPDATE inventory SET quantity=quantity-1 WHERE user_id=$1 AND kind=$2 AND quantity>0 RETURNING quantity',[s.data.user.id,kind]);if(!inv.rowCount){await client.query('ROLLBACK');return ack({error:'Item not in inventory'});}const item=(await client.query('INSERT INTO furniture(room_id,owner_id,kind,x,y) VALUES($1,$2,$3,$4,$5) RETURNING id,kind,x,y,rotation',[id,s.data.user.id,kind,x,y])).rows[0];await client.query('COMMIT');io.to(`room:${id}`).emit('furniture:added',item);ack({ok:true});}catch(e){await client.query('ROLLBACK');console.error(e);ack({error:'Placement failed'});}finally{client.release();}});
 s.on('furniture:rotate',async(itemId,ack=()=>{})=>{try{
   const roomId=s.data.roomId,id=Number(itemId);
   if(!roomId||!Number.isSafeInteger(id)||id<1)return ack({error:'Invalid furniture'});
   const result=await pool.query('UPDATE furniture SET rotation=(rotation+1)%4 WHERE id=$1 AND room_id=$2 AND owner_id=$3 RETURNING id,rotation',[id,roomId,s.data.user.id]);
   if(!result.rowCount)return ack({error:'Only the room owner can rotate this furniture'});
   io.to('room:'+roomId).emit('furniture:rotated',result.rows[0]);
   ack({ok:true,rotation:result.rows[0].rotation});
  }catch(e){console.error(e);ack({error:'Could not rotate furniture'})}
 });
 s.on('furniture:remove',async(itemId,ack=()=>{})=>{try{const id=s.data.roomId;const r=await pool.query('DELETE FROM furniture WHERE id=$1 AND room_id=$2 AND owner_id=$3 RETURNING kind',[Number(itemId),id,s.data.user.id]);if(!r.rowCount)return ack({error:'Not allowed'});await pool.query('INSERT INTO inventory(user_id,kind,quantity) VALUES($1,$2,1) ON CONFLICT(user_id,kind) DO UPDATE SET quantity=inventory.quantity+1',[s.data.user.id,r.rows[0].kind]);for(const [sid,pose] of poses)if(pose?.seatId===Number(itemId)){poses.delete(sid);io.to('room:'+id).emit('player:pose',{socketId:sid,pose:null});}io.to(`room:${id}`).emit('furniture:removed',Number(itemId));ack({ok:true});}catch(e){console.error(e);ack({error:'Remove failed'});}});
 s.on('disconnect',()=>leave(s));
});
app.get('/health',(_req,res)=>res.json({ok:true}));
app.get('*',(_req,res)=>res.sendFile(path.join(root,'index.html')));
const schema=await readFile(path.resolve(root,'../db/schema.sql'),'utf8');
for(let n=0;n<30;n++){try{await pool.query(schema);break;}catch(e){if(n===29)throw e;await new Promise(r=>setTimeout(r,2000));}}
http.listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('Pixel Haven listening'));
