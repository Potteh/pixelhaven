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
app.use(helmet({contentSecurityPolicy:false}));app.use('/api/mod/badges/definitions',express.json({limit:'400kb'}));app.use(express.json({limit:'12kb'}));
app.use('/api',rateLimit({windowMs:15*60*1000,limit:120,standardHeaders:'draft-7',legacyHeaders:false}));
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../web');
app.use(express.static(root));
const CATALOG={chair:35,sofa:95,table:65,plant:40,lamp:45,bed:120,arcade:160,club_sofa:240,royal_throne:450,ice_cream_machine:290,fridge:180,vending_machine:210,teleporter:350,door:125,smoke_machine:195,christmas_tree:180,christmas_sofa:175,christmas_fireplace:220,snowman:90,gift_stack:55,candy_cane_lamp:75,festive_rug:65,gold_bar:1000,nickel:5,quarter:25,neon_arcade:650,golden_fountain:1200,autumn_throne:720,moon_lamp:180,bookshelf:150,aquarium:380,autumn_tree:220,pumpkin_lantern:90,star_rug:135};
const safe=(s,max=240)=>String(s??'').trim().slice(0,max);
const token=u=>jwt.sign({id:u.id},secret,{expiresIn:'7d'});
const getUser=async id=>{const u=(await pool.query('SELECT id,username,coins,role,avatar,active_profile_id FROM users WHERE id=$1',[id])).rows[0];if(!u)return u;const p=u.active_profile_id?(await pool.query('SELECT id,name,avatar FROM game_profiles WHERE id=$1 AND user_id=$2',[u.active_profile_id,id])).rows[0]:null;u.profile=p||null;if(p?.avatar&&Object.keys(p.avatar).length)u.avatar=p.avatar;return u};
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
  if(req.user.active_profile_id)await pool.query('UPDATE game_profiles SET avatar=$1 WHERE id=$2 AND user_id=$3',[JSON.stringify(avatar),req.user.active_profile_id,req.user.id]);else await pool.query('UPDATE users SET avatar=$1 WHERE id=$2',[JSON.stringify(avatar),req.user.id]);
  const user=await getUser(req.user.id);req.user.avatar=user.profile?.avatar&&Object.keys(user.profile.avatar).length?user.profile.avatar:user.avatar;
  for(const socket of io.sockets.sockets.values())if(socket.data.user?.id===req.user.id){
    socket.data.user.avatar=user.avatar;
    if(socket.data.roomId)io.to('room:'+socket.data.roomId).emit('player:avatar',{socketId:socket.id,avatar:user.avatar});
  }
  res.json(user);
 }catch(e){fail(res,e)}
});
const staffRoles=['moderator','admin','owner'];
const isStaff=u=>staffRoles.includes(u.role);
const isAdmin=u=>['admin','owner'].includes(u.role);
const staffGuard=(req,res,next)=>isStaff(req.user)?next():res.status(403).json({error:'Staff only'});
const adminGuard=(req,res,next)=>isAdmin(req.user)?next():res.status(403).json({error:'Admin only'});
const ownerGuard=(req,res,next)=>req.user.role==='owner'?next():res.status(403).json({error:'Owner only'});
const validId=v=>Number.isSafeInteger(Number(v))&&Number(v)>0;

app.get('/api/rooms',auth,async(req,res)=>{try{res.json((await pool.query('SELECT r.id,r.name,r.description,r.owner_id,r.is_public,u.username AS owner FROM rooms r LEFT JOIN users u ON u.id=r.owner_id ORDER BY r.id LIMIT 100')).rows);}catch(e){fail(res,e);}});
// Large furniture occupies more than its anchor tile; rotations swap its footprint axes.
const furnitureSize=kind=>({
 sofa:[2,1],club_sofa:[2,1],christmas_sofa:[2,1],bed:[2,2],
 table:[2,1],bookshelf:[2,1],aquarium:[2,1],christmas_fireplace:[2,1],
 golden_fountain:[2,2],vending_machine:[1,2],fridge:[1,2]
}[kind]||[1,1]);
const furnitureTiles=(item)=>{
 const [w,h]=furnitureSize(item.kind),rot=((Number(item.rotation)||0)%4+4)%4;
 const width=rot%2?h:w,height=rot%2?w:h,tiles=[];
 for(let dx=0;dx<width;dx++)for(let dy=0;dy<height;dy++)tiles.push({x:Number(item.x)+dx,y:Number(item.y)+dy});
 return tiles;
};
const stackableKinds=new Set(['lamp','moon_lamp','candy_cane_lamp','plant','pumpkin_lantern','gift_stack','nickel','quarter','gold_bar']);
const supportsStack=new Set(['table']);
const stackHeightFor=(item)=>Number(item.stack_height)||0;
const groundFurniture=items=>items.filter(f=>!f.support_id);
const validateStack=(candidate,items,supportId)=>{
 const support=items.find(f=>Number(f.id)===Number(supportId));
 if(!support||!supportsStack.has(support.kind)||support.support_id||!stackableKinds.has(candidate.kind)||furnitureSize(candidate.kind).some(v=>v!==1))return null;
 const tiles=furnitureTiles(support);
 if(!tiles.some(p=>p.x===candidate.x&&p.y===candidate.y))return null;
 if(items.some(f=>f.support_id&&f.x===candidate.x&&f.y===candidate.y))return null;
 return support;
};
const furnitureBlocked=(items,ignoreId)=>new Set(items.filter(f=>!f.support_id).filter(f=>Number(f.id)!==Number(ignoreId)).flatMap(f=>furnitureTiles(f).map(p=>p.x+','+p.y)));
const validFurniturePlacement=(candidate,items,ignoreId)=>{
 const blocked=furnitureBlocked(groundFurniture(items),ignoreId);
 return furnitureTiles(candidate).every(p=>p.x>=0&&p.x<=9&&p.y>=0&&p.y<=9&&!blocked.has(p.x+','+p.y));
};
const roomStyle=(body={})=>{
 const validColor=(v,fallback)=>typeof v==='string'&&/^#[0-9a-fA-F]{6}$/.test(v)?v:fallback;
 return {wall_color:validColor(body.wall_color,'#827b8f'),floor_color:validColor(body.floor_color,'#b3b8c8'),floor_pattern:['checker','solid','wood','tiles'].includes(body.floor_pattern)?body.floor_pattern:'checker',layout:['classic','lounge','studio'].includes(body.layout)?body.layout:'classic'};
};
app.post('/api/rooms',auth,async(req,res)=>{try{const name=safe(req.body.name,64);if(name.length<3)return res.status(400).json({error:'Room name too short'});const count=await pool.query('SELECT count(*)::int AS n FROM rooms WHERE owner_id=$1',[req.user.id]);if(count.rows[0].n>=10)return res.status(400).json({error:'Room limit reached'});const style=roomStyle(req.body);const r=await pool.query('INSERT INTO rooms(owner_id,name,description,is_public,wall_color,floor_color,floor_pattern,layout) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[req.user.id,name,safe(req.body.description,240),req.body.is_public!==false,style.wall_color,style.floor_color,style.floor_pattern,style.layout]);res.json(r.rows[0]);}catch(e){fail(res,e);}});
app.patch('/api/rooms/:id',auth,async(req,res)=>{
 const id=Number(req.params.id);if(!validId(id))return res.status(400).json({error:'Invalid room'});
 try{
  const current=(await pool.query('SELECT * FROM rooms WHERE id=$1 AND owner_id=$2',[id,req.user.id])).rows[0];
  if(!current)return res.status(403).json({error:'Only the room owner can edit this room'});
  const style=roomStyle({...current,...req.body});
  const name=req.body.name===undefined?current.name:safe(req.body.name,64);
  if(name.length<3)return res.status(400).json({error:'Room name too short'});
  const description=req.body.description===undefined?current.description:safe(req.body.description,240);
  const isPublic=req.body.is_public===undefined?current.is_public:req.body.is_public===true;
  const updated=(await pool.query('UPDATE rooms SET name=$1,description=$2,is_public=$3,wall_color=$4,floor_color=$5,floor_pattern=$6,layout=$7 WHERE id=$8 AND owner_id=$9 RETURNING *',[name,description,isPublic,style.wall_color,style.floor_color,style.floor_pattern,style.layout,id,req.user.id])).rows[0];
  io.to('room:'+id).emit('room:updated',updated);
  if(current.is_public&&!isPublic)await pool.query("DELETE FROM room_entry_requests WHERE room_id=$1 AND status='approved'",[id]);if(current.is_public&&!isPublic)for(const sid of [...(occupants.get(id)||[])]){const guest=io.sockets.sockets.get(sid);if(guest&&guest.data.user.id!==req.user.id){leave(guest);guest.emit('room:kicked',{reason:'Room is now locked'});}}
  res.json(updated);
 }catch(e){fail(res,e)}
});
// Locked-room requests are explicit; only the room owner can approve or deny them.
app.post('/api/rooms/:id/request-entry',auth,async(req,res)=>{
 const roomId=Number(req.params.id);if(!validId(roomId))return res.status(400).json({error:'Invalid room'});
 try{
  const room=(await pool.query('SELECT id,owner_id,is_public FROM rooms WHERE id=$1',[roomId])).rows[0];
  if(!room)return res.sendStatus(404);
  if(room.is_public||room.owner_id===req.user.id)return res.status(400).json({error:'You can already enter this room'});
  const kicked=roomKickTimeouts.get(roomId+':'+req.user.id)||0;
  if(kicked>Date.now())return res.status(403).json({error:'You were removed from this room; wait before requesting entry'});
  const existing=(await pool.query('SELECT status FROM room_entry_requests WHERE room_id=$1 AND user_id=$2',[roomId,req.user.id])).rows[0];
  if(existing?.status==='approved')return res.json({status:'approved'});
  if(existing?.status==='pending')return res.json({status:'pending'});
  const row=(await pool.query("INSERT INTO room_entry_requests(room_id,user_id,status,created_at,decided_at) VALUES($1,$2,'pending',now(),NULL) ON CONFLICT(room_id,user_id) DO UPDATE SET status='pending',created_at=now(),decided_at=NULL RETURNING id",[roomId,req.user.id])).rows[0];
  for(const socket of io.sockets.sockets.values())if(socket.data.user?.id===room.owner_id)socket.emit('room:entry-request',{roomId,requestId:row.id});
  res.json({status:'pending'});
 }catch(e){fail(res,e)}
});
app.get('/api/rooms/:id/requests',auth,async(req,res)=>{
 const roomId=Number(req.params.id);if(!validId(roomId))return res.status(400).json({error:'Invalid room'});
 try{
  const room=(await pool.query('SELECT owner_id FROM rooms WHERE id=$1',[roomId])).rows[0];
  if(!room||room.owner_id!==req.user.id)return res.sendStatus(403);
  res.json((await pool.query("SELECT q.id,q.user_id,q.status,q.created_at,u.username FROM room_entry_requests q JOIN users u ON u.id=q.user_id WHERE q.room_id=$1 AND q.status='pending' ORDER BY q.created_at ASC LIMIT 100",[roomId])).rows);
 }catch(e){fail(res,e)}
});
app.post('/api/rooms/:id/requests/:requestId',auth,async(req,res)=>{
 const roomId=Number(req.params.id),requestId=Number(req.params.requestId),decision=req.body.decision;
 if(!validId(roomId)||!validId(requestId)||!['approved','denied'].includes(decision))return res.status(400).json({error:'Invalid decision'});
 try{
  const room=(await pool.query('SELECT owner_id,is_public FROM rooms WHERE id=$1',[roomId])).rows[0];
  if(!room||room.owner_id!==req.user.id)return res.sendStatus(403);
  if(room.is_public)return res.status(400).json({error:'Room is already open'});
  const row=(await pool.query("UPDATE room_entry_requests SET status=$1,decided_at=now() WHERE id=$2 AND room_id=$3 AND status='pending' RETURNING user_id",[decision,requestId,roomId])).rows[0];
  if(!row)return res.status(404).json({error:'Request no longer pending'});
  for(const socket of io.sockets.sockets.values())if(socket.data.user?.id===row.user_id)socket.emit('room:entry-decision',{roomId,status:decision});
  res.json({ok:true,status:decision});
 }catch(e){fail(res,e)}
});
// Historical room chat is staff-only, paginated, searchable, and bounded.
app.get('/api/mod/chatlogs',auth,staffGuard,async(req,res)=>{
 try{
  const roomId=req.query.roomId?Number(req.query.roomId):null,userId=req.query.userId?Number(req.query.userId):null;
  const before=req.query.before?Number(req.query.before):null,q=safe(req.query.q,80);
  if((roomId!==null&&!validId(roomId))||(userId!==null&&!validId(userId))||(before!==null&&!validId(before)))return res.status(400).json({error:'Invalid filter'});
  const limit=Math.min(100,Math.max(1,Number(req.query.limit)||50));
  const rows=(await pool.query(`SELECT m.id,m.body,m.created_at,m.room_id,m.user_id,COALESCE(u.username,'Deleted user') AS username,COALESCE(r.name,'Deleted room') AS room_name
   FROM messages m LEFT JOIN users u ON u.id=m.user_id LEFT JOIN rooms r ON r.id=m.room_id
   WHERE ($1::integer IS NULL OR m.room_id=$1) AND ($2::integer IS NULL OR m.user_id=$2)
   AND ($3::bigint IS NULL OR m.id<$3) AND ($4::text='' OR m.body ILIKE '%'||$4||'%')
   ORDER BY m.id DESC LIMIT $5`,[roomId,userId,before,q,limit])).rows;
  res.json({messages:rows,nextBefore:rows.length===limit?rows[rows.length-1].id:null});
 }catch(e){fail(res,e)}
});
// Social API: friendship and blocks are account-wide across profiles.
const pair=(a,b)=>[Math.min(a,b),Math.max(a,b)];
const blocked=async(a,b)=>(await pool.query('SELECT 1 FROM social_blocks WHERE (blocker_id=$1 AND blocked_id=$2) OR (blocker_id=$2 AND blocked_id=$1)',[a,b])).rowCount>0;
const areFriends=async(a,b)=>{const [lo,hi]=pair(a,b);return (await pool.query("SELECT 1 FROM social_friendships WHERE user_low=$1 AND user_high=$2 AND status='accepted'",[lo,hi])).rowCount>0};
const socialNotify=(id,event,data)=>{for(const socket of io.sockets.sockets.values())if(socket.data.user?.id===id)socket.emit(event,data)};
// Badge catalog, profile badges and administrator-managed grants.
app.get('/api/badges',auth,async(req,res)=>{try{res.json((await pool.query('SELECT code,name,image_path FROM badge_definitions ORDER BY code')).rows)}catch(e){fail(res,e)}});
// Achievement thresholds are server-controlled and cannot be awarded by the client.
const ACHIEVEMENTS=[
 {code:'FIRST_FRIEND',name:'First Friendship',description:'Make your first friend',metric:'friends',target:1},
 {code:'SOCIAL_STAR',name:'Social Star',description:'Make five friends',metric:'friends',target:5},
 {code:'ROOM_CREATOR',name:'Room Creator',description:'Create your first room',metric:'rooms',target:1},
 {code:'ROOM_DESIGNER',name:'Room Designer',description:'Create five rooms',metric:'rooms',target:5},
 {code:'FURNITURE_COLLECTOR',name:'Furniture Collector',description:'Own ten furniture items',metric:'furniture',target:10},
 {code:'BADGE_COLLECTOR',name:'Badge Collector',description:'Collect three badges',metric:'badges',target:3}
];
async function achievementProgress(id){
 const r=(await pool.query(`SELECT
 (SELECT count(*)::int FROM social_friendships WHERE status='accepted' AND (user_low=$1 OR user_high=$1)) AS friends,
 (SELECT count(*)::int FROM rooms WHERE owner_id=$1) AS rooms,
 (SELECT coalesce(sum(quantity),0)::int FROM inventory WHERE user_id=$1) AS furniture,
 (SELECT count(*)::int FROM user_badges WHERE user_id=$1) AS badges`,[id])).rows[0];
 const newly=[];
 for(const a of ACHIEVEMENTS){if(r[a.metric]>=a.target){const awarded=await pool.query('INSERT INTO profile_achievements(user_id,code) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING code',[id,a.code]);if(awarded.rowCount)newly.push(a.code)}}
 return {progress:ACHIEVEMENTS.map(a=>({...a,current:Math.min(r[a.metric],a.target),unlocked:r[a.metric]>=a.target})),newly};
}
// Small, validated PNG/GIF uploads are stored in PostgreSQL so badges survive container rebuilds.
app.post('/api/mod/badges/definitions',auth,adminGuard,async(req,res)=>{
 const code=String(req.body?.code||'').trim().toUpperCase(),name=safe(req.body?.name,80),image=String(req.body?.image||'');
 if(!/^[A-Z0-9_]{2,16}$/.test(code)||name.length<2)return res.status(400).json({error:'Badge code must be 2–16 letters/numbers; name at least 2 characters'});
 const match=/^data:image\/(png|gif);base64,([A-Za-z0-9+/]+={0,2})$/.exec(image);
 if(!match||image.length>350000)return res.status(400).json({error:'Upload a PNG or GIF no larger than 256 KB'});
 const bytes=Buffer.from(match[2],'base64');
 const png=bytes.length>=24&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 const gif=bytes.length>=10&&['GIF87a','GIF89a'].includes(bytes.toString('ascii',0,6));
 if(bytes.length>262144||bytes.length<20||(match[1]==='png'?!png:!gif))return res.status(400).json({error:'Invalid PNG/GIF image or file too large'});
 const width=png?bytes.readUInt32BE(16):bytes.readUInt16LE(6),height=png?bytes.readUInt32BE(20):bytes.readUInt16LE(8);
 if(width<1||height<1||width>512||height>512)return res.status(400).json({error:'Badge dimensions must be 1–512 pixels'});
 try{
  const inserted=await pool.query('INSERT INTO badge_definitions(code,name,image_path) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING code',[code,name,image]);
  if(!inserted.rowCount)return res.status(409).json({error:'Badge code already exists'});
  res.status(201).json({code,name,image_path:image});
 }catch(e){fail(res,e)}
});
app.get('/api/achievements',auth,(req,res)=>res.json(ACHIEVEMENTS));
// Public profiles expose safe display fields, never account secrets.
app.get('/api/users/:id/profile',auth,async(req,res)=>{
 const id=Number(req.params.id);if(!validId(id))return res.status(400).json({error:'Invalid player'});
 try{
  const profile=(await pool.query(`SELECT u.id,u.username,u.role,u.motto,u.created_at,
   (SELECT count(*)::int FROM rooms WHERE owner_id=u.id) AS rooms_created,
   (SELECT count(*)::int FROM social_friendships WHERE status='accepted' AND (user_low=u.id OR user_high=u.id)) AS friend_count
   FROM users u WHERE u.id=$1`,[id])).rows[0];
  if(!profile)return res.status(404).json({error:'Player not found'});
  const stats=id===req.user.id?await achievementProgress(id):null;
  const [badges,equipped,achievements]=await Promise.all([
   pool.query('SELECT d.code,d.name,d.image_path,b.granted_at FROM user_badges b JOIN badge_definitions d ON d.code=b.code WHERE b.user_id=$1 ORDER BY b.granted_at DESC',[id]),
   pool.query('SELECT code,position FROM profile_equipped_badges WHERE user_id=$1 ORDER BY position',[id]),
   pool.query('SELECT code,earned_at FROM profile_achievements WHERE user_id=$1 ORDER BY earned_at DESC',[id])
  ]);
  res.json({...profile,badges:badges.rows,equipped:equipped.rows,achievements:achievements.rows,achievement_progress:stats?.progress||null,new_achievements:stats?.newly||[]});
 }catch(e){fail(res,e)}
});
app.patch('/api/me/profile',auth,async(req,res)=>{
 const motto=String(req.body?.motto??'').trim();
 if(motto.length>120||/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]/.test(motto))return res.status(400).json({error:'Motto must be 120 characters or fewer'});
 try{await pool.query('UPDATE users SET motto=$1 WHERE id=$2',[motto,req.user.id]);res.json({ok:true,motto})}catch(e){fail(res,e)}
});
app.put('/api/me/equipped-badges',auth,async(req,res)=>{
 const codes=req.body?.codes;
 if(!Array.isArray(codes)||codes.length>3||codes.some(c=>typeof c!=='string'||!/^[A-Z0-9_]{2,16}$/.test(c))||new Set(codes).size!==codes.length)return res.status(400).json({error:'Choose up to three distinct earned badges'});
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const owned=(await client.query('SELECT code FROM user_badges WHERE user_id=$1 FOR UPDATE',[req.user.id])).rows.map(r=>r.code);
  if(codes.some(c=>!owned.includes(c))){await client.query('ROLLBACK');return res.status(403).json({error:'You can only equip badges you own'})}
  await client.query('DELETE FROM profile_equipped_badges WHERE user_id=$1',[req.user.id]);
  for(let i=0;i<codes.length;i++)await client.query('INSERT INTO profile_equipped_badges(user_id,code,position) VALUES($1,$2,$3)',[req.user.id,codes[i],i+1]);
  await client.query('COMMIT');res.json({ok:true,codes});
 }catch(e){await client.query('ROLLBACK');fail(res,e)}finally{client.release()}
});
app.get('/api/users/:id/badges',auth,async(req,res)=>{const id=Number(req.params.id);if(!validId(id))return res.status(400).json({error:'Invalid player'});try{res.json((await pool.query('SELECT d.code,d.name,d.image_path,b.granted_at FROM user_badges b JOIN badge_definitions d ON d.code=b.code WHERE b.user_id=$1 ORDER BY b.granted_at DESC',[id])).rows)}catch(e){fail(res,e)}});
app.post('/api/mod/badges/grant',auth,adminGuard,async(req,res)=>{
 const id=Number(req.body.userId),code=String(req.body.code||'').trim().toUpperCase();
 if(!validId(id)||!/^[A-Z0-9_]{2,16}$/.test(code))return res.status(400).json({error:'Invalid player or badge code'});
 try{
  const target=(await pool.query('SELECT role FROM users WHERE id=$1',[id])).rows[0];
  if(!target)return res.status(404).json({error:'Player not found'});
  if(target.role==='owner'&&req.user.role!=='owner')return res.status(403).json({error:'Owner badges require owner access'});
  const result=await pool.query('INSERT INTO user_badges(user_id,code,granted_by) VALUES($1,$2,$3) ON CONFLICT(user_id,code) DO NOTHING RETURNING code',[id,code,req.user.id]);
  socialNotify(id,'badges:changed',{userId:id});res.json({ok:true,granted:!!result.rowCount});
 }catch(e){if(e.code==='23503')return res.status(404).json({error:'Badge code not found'});fail(res,e)}
});
app.post('/api/mod/badges/revoke',auth,adminGuard,async(req,res)=>{
 const id=Number(req.body.userId),code=String(req.body.code||'').trim().toUpperCase();
 if(!validId(id)||!/^[A-Z0-9_]{2,16}$/.test(code))return res.status(400).json({error:'Invalid player or badge code'});
 try{
  const target=(await pool.query('SELECT role FROM users WHERE id=$1',[id])).rows[0];
  if(!target)return res.status(404).json({error:'Player not found'});
  if(target.role==='owner'&&req.user.role!=='owner')return res.status(403).json({error:'Owner badges require owner access'});
  const result=await pool.query('DELETE FROM user_badges WHERE user_id=$1 AND code=$2 RETURNING code',[id,code]);
  socialNotify(id,'badges:changed',{userId:id});res.json({ok:true,revoked:!!result.rowCount});
 }catch(e){fail(res,e)}
});
app.get('/api/social/friends',auth,async(req,res)=>{
 try{
  const id=req.user.id;
  const rows=(await pool.query(`SELECT f.user_low,f.user_high,f.requested_by,f.status,u.id,u.username,
   CASE WHEN f.requested_by=$1 THEN 'outgoing' ELSE 'incoming' END AS direction
   FROM social_friendships f JOIN users u ON u.id=CASE WHEN f.user_low=$1 THEN f.user_high ELSE f.user_low END
   WHERE f.user_low=$1 OR f.user_high=$1 ORDER BY f.updated_at DESC`,[id])).rows;
  res.json(rows.map(r=>({id:r.id,username:r.username,status:r.status,direction:r.direction,online:[...io.sockets.sockets.values()].some(s=>s.data.user?.id===r.id),roomId:[...io.sockets.sockets.values()].find(s=>s.data.user?.id===r.id&&s.data.roomId)?.data.roomId||null})));
 }catch(e){fail(res,e)}
});
app.get('/api/social/unread',auth,async(req,res)=>{try{
 const id=req.user.id;
 const rows=(await pool.query(`SELECT m.sender_id AS friend_id,count(*)::int AS unread FROM social_messages m
 JOIN social_friendships f ON f.user_low=LEAST(m.sender_id,m.recipient_id) AND f.user_high=GREATEST(m.sender_id,m.recipient_id) AND f.status='accepted'
 LEFT JOIN social_reads r ON r.user_id=m.recipient_id AND r.friend_id=m.sender_id
 WHERE m.recipient_id=$1 AND m.id>COALESCE(r.last_read_id,0)
 AND NOT EXISTS(SELECT 1 FROM social_blocks b WHERE (b.blocker_id=$1 AND b.blocked_id=m.sender_id) OR (b.blocked_id=$1 AND b.blocker_id=m.sender_id))
 GROUP BY m.sender_id`,[id])).rows;
 res.json({total:rows.reduce((n,r)=>n+r.unread,0),friends:rows});
 }catch(e){fail(res,e)}
});
app.post('/api/social/messages/:id/read',auth,async(req,res)=>{const target=Number(req.params.id);if(!validId(target))return res.status(400).json({error:'Invalid friend'});try{
 if(await blocked(req.user.id,target)||!await areFriends(req.user.id,target))return res.status(403).json({error:'Messaging requires friendship'});
 await pool.query(`INSERT INTO social_reads(user_id,friend_id,last_read_id)
 SELECT $1,$2,COALESCE(MAX(id),0) FROM social_messages WHERE sender_id=$2 AND recipient_id=$1
 ON CONFLICT(user_id,friend_id) DO UPDATE SET last_read_id=GREATEST(social_reads.last_read_id,EXCLUDED.last_read_id)`,[req.user.id,target]);
 res.json({ok:true});
 }catch(e){fail(res,e)}
});
app.get('/api/social/blocks',auth,async(req,res)=>{
 try{res.json((await pool.query('SELECT u.id,u.username FROM social_blocks b JOIN users u ON u.id=b.blocked_id WHERE b.blocker_id=$1 ORDER BY b.created_at DESC',[req.user.id])).rows)}catch(e){fail(res,e)}
});
app.post('/api/social/friends/:id',auth,async(req,res)=>{
 const target=Number(req.params.id),action=req.body.action;
 if(!validId(target)||target===req.user.id||!['request','accept','decline','remove'].includes(action))return res.status(400).json({error:'Invalid friend action'});
 try{
  if(await blocked(req.user.id,target))return res.status(403).json({error:'Friend requests unavailable'});
  const [lo,hi]=pair(req.user.id,target);
  if(action==='request'){
   if(!(await pool.query('SELECT 1 FROM users WHERE id=$1',[target])).rowCount)return res.sendStatus(404);
   const existing=(await pool.query('SELECT status FROM social_friendships WHERE user_low=$1 AND user_high=$2',[lo,hi])).rows[0];
   if(existing)return res.status(409).json({error:'Friend request already exists'});
   await pool.query("INSERT INTO social_friendships(user_low,user_high,requested_by,status) VALUES($1,$2,$3,'pending')",[lo,hi,req.user.id]);
  }else if(action==='accept'){
   const result=await pool.query("UPDATE social_friendships SET status='accepted',updated_at=now() WHERE user_low=$1 AND user_high=$2 AND requested_by<>$3 AND status='pending' RETURNING user_low",[lo,hi,req.user.id]);
   if(!result.rowCount)return res.status(404).json({error:'No incoming friend request'});
  }else{
   const result=await pool.query("DELETE FROM social_friendships WHERE user_low=$1 AND user_high=$2 AND ($3='remove' OR (status='pending' AND requested_by<>$4)) RETURNING user_low",[lo,hi,action,req.user.id]);
   if(!result.rowCount)return res.status(404).json({error:'Friendship not found'});
  }
  socialNotify(target,'social:changed',{type:'friends'});socialNotify(req.user.id,'social:changed',{type:'friends'});res.json({ok:true});
 }catch(e){fail(res,e)}
});
app.post('/api/social/blocks/:id',auth,async(req,res)=>{
 const target=Number(req.params.id),action=req.body.action;
 if(!validId(target)||target===req.user.id||!['block','unblock'].includes(action))return res.status(400).json({error:'Invalid block action'});
 try{
  if(action==='block'){
   await pool.query('INSERT INTO social_blocks(blocker_id,blocked_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[req.user.id,target]);
   const [lo,hi]=pair(req.user.id,target);await pool.query('DELETE FROM social_friendships WHERE user_low=$1 AND user_high=$2',[lo,hi]);
  }else await pool.query('DELETE FROM social_blocks WHERE blocker_id=$1 AND blocked_id=$2',[req.user.id,target]);
  socialNotify(target,'social:changed',{type:'friends'});socialNotify(req.user.id,'social:changed',{type:'friends'});res.json({ok:true});
 }catch(e){fail(res,e)}
});
app.get('/api/social/messages/:id',auth,async(req,res)=>{
 const target=Number(req.params.id),before=req.query.before?Number(req.query.before):null;
 if(!validId(target)||(before!==null&&!validId(before)))return res.status(400).json({error:'Invalid player'});
 try{
  if(await blocked(req.user.id,target)||!await areFriends(req.user.id,target))return res.status(403).json({error:'Messaging requires friendship'});
  const rows=(await pool.query('SELECT id,sender_id,recipient_id,body,created_at FROM social_messages WHERE ((sender_id=$1 AND recipient_id=$2) OR (sender_id=$2 AND recipient_id=$1)) AND ($3::bigint IS NULL OR id<$3) ORDER BY id DESC LIMIT 50',[req.user.id,target,before])).rows;
  res.json({messages:rows.reverse(),nextBefore:rows.length===50?rows[0].id:null});
 }catch(e){fail(res,e)}
});
app.post('/api/social/messages/:id',auth,async(req,res)=>{
 const target=Number(req.params.id),body=safe(req.body.body,1000);
 if(!validId(target)||target===req.user.id||!body)return res.status(400).json({error:'Invalid message'});
 try{
  if(await blocked(req.user.id,target)||!await areFriends(req.user.id,target))return res.status(403).json({error:'Messaging requires friendship'});
  const recent=await pool.query("SELECT count(*)::int AS n FROM social_messages WHERE sender_id=$1 AND created_at>now()-interval '1 minute'",[req.user.id]);
  if(recent.rows[0].n>=20)return res.status(429).json({error:'Message rate limit reached'});
  const msg=(await pool.query('INSERT INTO social_messages(sender_id,recipient_id,body) VALUES($1,$2,$3) RETURNING id,sender_id,recipient_id,body,created_at',[req.user.id,target,body])).rows[0];
  socialNotify(target,'social:message',msg);socialNotify(req.user.id,'social:message',msg);res.json(msg);
 }catch(e){fail(res,e)}
});
app.post('/api/social/messages/:id/report',auth,async(req,res)=>{
 const messageId=Number(req.params.id),reason=safe(req.body.reason,500);
 if(!validId(messageId)||reason.length<5)return res.status(400).json({error:'Provide a report reason'});
 try{
  const message=(await pool.query('SELECT * FROM social_messages WHERE id=$1',[messageId])).rows[0];
  if(!message||message.recipient_id!==req.user.id)return res.status(403).json({error:'Only the recipient can report this message'});
  await pool.query('INSERT INTO social_message_reports(reporter_id,message_id,reason) VALUES($1,$2,$3) ON CONFLICT(reporter_id,message_id) DO NOTHING',[req.user.id,messageId,reason]);
  res.json({ok:true});
 }catch(e){fail(res,e)}
});
app.get('/api/mod/message-reports',auth,staffGuard,async(req,res)=>{
 try{res.json((await pool.query('SELECT mr.id,mr.reason,mr.created_at,m.body,m.sender_id,m.recipient_id,s.username sender,r.username recipient FROM social_message_reports mr JOIN social_messages m ON m.id=mr.message_id JOIN users s ON s.id=m.sender_id JOIN users r ON r.id=m.recipient_id ORDER BY mr.created_at DESC LIMIT 100')).rows)}catch(e){fail(res,e)}
});
app.get('/api/catalog',auth,(_req,res)=>res.json(CATALOG));
const CATALOG_META={
 neon_arcade:{name:'Neon Arcade',collection:'Limited Editions',rarity:'legendary',description:'A glowing arcade cabinet',limited:true},
 golden_fountain:{name:'Golden Fountain',collection:'Limited Editions',rarity:'legendary',description:'A gleaming centerpiece',limited:true},
 autumn_throne:{name:'Autumn Throne',collection:'Limited Editions',rarity:'epic',description:'A seasonal collector throne',limited:true},
 moon_lamp:{name:'Moon Lamp',collection:'Modern Living',rarity:'rare',description:'Soft lunar lighting'},
 bookshelf:{name:'Bookshelf',collection:'Modern Living',rarity:'common',description:'A cozy reading corner'},
 aquarium:{name:'Aquarium',collection:'Modern Living',rarity:'rare',description:'An illuminated fish tank'},
 autumn_tree:{name:'Autumn Tree',collection:'Autumn Festival',rarity:'uncommon',description:'Golden falling leaves'},
 pumpkin_lantern:{name:'Pumpkin Lantern',collection:'Autumn Festival',rarity:'uncommon',description:'A glowing harvest decoration'},
 star_rug:{name:'Star Rug',collection:'Modern Living',rarity:'uncommon',description:'A celestial floor accent'}
};
app.get('/api/catalog/details',auth,async(_req,res)=>{
 try{const stock=(await pool.query('SELECT kind,remaining,initial_stock FROM catalog_limited_stock')).rows;const byKind=Object.fromEntries(stock.map(x=>[x.kind,x]));
  res.json(Object.entries(CATALOG).map(([kind,price])=>({kind,price,name:CATALOG_META[kind]?.name||kind.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase()),collection:CATALOG_META[kind]?.collection||'Classic Collection',rarity:CATALOG_META[kind]?.rarity||'common',description:CATALOG_META[kind]?.description||'Classic hotel furniture',limited:!!CATALOG_META[kind]?.limited,remaining:byKind[kind]?.remaining??null,initial_stock:byKind[kind]?.initial_stock??null})));
 }catch(e){fail(res,e)}
});

app.get('/api/inventory',auth,async(req,res)=>{try{res.json((await pool.query('SELECT kind,quantity FROM inventory WHERE user_id=$1',[req.user.id])).rows);}catch(e){fail(res,e);}});
app.post('/api/buy',auth,async(req,res)=>{const kind=safe(req.body.kind,30),price=CATALOG[kind];if(!price)return res.status(400).json({error:'Unknown item'});const client=await pool.connect();try{await client.query('BEGIN');if(CATALOG_META[kind]?.limited){const stock=await client.query('UPDATE catalog_limited_stock SET remaining=remaining-1 WHERE kind=$1 AND remaining>0 RETURNING remaining',[kind]);if(!stock.rowCount){await client.query('ROLLBACK');return res.status(409).json({error:'Limited edition sold out'})}}const r=await client.query('UPDATE users SET coins=coins-$1 WHERE id=$2 AND coins >= $1 RETURNING coins',[price,req.user.id]);if(!r.rowCount){await client.query('ROLLBACK');const balance=await client.query('SELECT coins FROM users WHERE id=$1',[req.user.id]);return res.status(400).json({error:'Not enough coins. Available: '+(balance.rows[0]?.coins??0)+'; item price: '+price});}await client.query('INSERT INTO inventory(user_id,kind,quantity) VALUES($1,$2,1) ON CONFLICT(user_id,kind) DO UPDATE SET quantity=inventory.quantity+1',[req.user.id,kind]);await client.query('INSERT INTO catalog_purchases(user_id,kind,price) VALUES($1,$2,$3)',[req.user.id,kind,price]);await client.query('COMMIT');res.json({coins:r.rows[0].coins});}catch(e){await client.query('ROLLBACK');fail(res,e);}finally{client.release();}});
const COIN_TOKENS={gold_bar:1000,nickel:5,quarter:25};
app.post('/api/redeem',auth,async(req,res)=>{
 const kind=safe(req.body.kind,30),value=COIN_TOKENS[kind],quantity=Number(req.body.quantity||1);
 if(!value||!Number.isInteger(quantity)||quantity<1||quantity>99)return res.status(400).json({error:'Invalid coin token'});
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const deducted=await client.query('UPDATE inventory SET quantity=quantity-$1 WHERE user_id=$2 AND kind=$3 AND quantity >= $1 RETURNING quantity',[quantity,req.user.id,kind]);
  if(!deducted.rowCount){await client.query('ROLLBACK');return res.status(400).json({error:'Not enough tokens'})}
  const updated=await client.query('UPDATE users SET coins=coins+$1 WHERE id=$2 RETURNING coins',[value*quantity,req.user.id]);
  await client.query('COMMIT');res.json({coins:updated.rows[0].coins});
 }catch(e){await client.query('ROLLBACK');fail(res,e)}finally{client.release()}
});
app.post('/api/mod/ban',auth,async(req,res)=>{try{if(req.user.role!=='admin')return res.sendStatus(403);const id=Number(req.body.userId);if(!Number.isInteger(id)||id===req.user.id)return res.status(400).json({error:'Invalid target'});await pool.query('INSERT INTO bans(user_id,reason) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET reason=$2,expires_at=NULL',[id,safe(req.body.reason,240)]);for(const s of io.sockets.sockets.values())if(s.data.user?.id===id)s.disconnect(true);res.json({ok:true});}catch(e){fail(res,e);}});

const tradeKinds=Object.keys(CATALOG);
const tradeItems=raw=>{
 if(!Array.isArray(raw)||raw.length>12)return null;
 const items={};
 for(const item of raw){if(!item||!tradeKinds.includes(item.kind)||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>99)return null;items[item.kind]=(items[item.kind]||0)+item.quantity;if(items[item.kind]>99)return null}
 return items;
};
async function ensureCommunityTables(){
 await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS active_profile_id INTEGER');
 await pool.query(`CREATE TABLE IF NOT EXISTS game_profiles(id SERIAL PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,name VARCHAR(24) NOT NULL,avatar JSONB NOT NULL DEFAULT '{}'::jsonb,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE(user_id,name))`);
 await pool.query(`CREATE TABLE IF NOT EXISTS player_reports(id BIGSERIAL PRIMARY KEY, reporter_id INTEGER REFERENCES users(id) ON DELETE SET NULL, target_id INTEGER REFERENCES users(id) ON DELETE SET NULL, category TEXT NOT NULL, details VARCHAR(1000) NOT NULL, status TEXT NOT NULL DEFAULT 'open', assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), resolved_at TIMESTAMPTZ)`);
 await pool.query(`CREATE TABLE IF NOT EXISTS player_warnings(id BIGSERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, moderator_id INTEGER REFERENCES users(id) ON DELETE SET NULL, reason VARCHAR(500) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
 await pool.query(`CREATE TABLE IF NOT EXISTS staff_audit(id BIGSERIAL PRIMARY KEY, actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL, target_id INTEGER REFERENCES users(id) ON DELETE SET NULL, action TEXT NOT NULL, details JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
 await pool.query(`CREATE TABLE IF NOT EXISTS furniture_trades(id BIGSERIAL PRIMARY KEY, sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, offered JSONB NOT NULL, requested JSONB NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
 await pool.query("CREATE INDEX IF NOT EXISTS idx_trades_recipient ON furniture_trades(recipient_id,status)");
 const ownerName=process.env.PIXELHAVEN_OWNER_USERNAME;
 if(ownerName){await pool.query("UPDATE users SET role='owner' WHERE lower(username)=lower($1) AND role <> 'owner'",[ownerName]);}
}
ensureCommunityTables().catch(e=>{console.error('Community schema initialization failed',e);process.exit(1)});
const displayUser=u=>({...u,username:u.profile?.name||u.username,accountName:u.username,avatar:u.profile?.avatar&&Object.keys(u.profile.avatar).length?u.profile.avatar:u.avatar});
app.get('/api/profiles',auth,async(req,res)=>{try{res.json((await pool.query('SELECT id,name,avatar FROM game_profiles WHERE user_id=$1 ORDER BY id',[req.user.id])).rows)}catch(e){fail(res,e)}});
app.post('/api/profiles',auth,async(req,res)=>{try{
 const name=safe(req.body.name,24);
 if(!/^[a-zA-Z0-9_]{3,24}$/.test(name))return res.status(400).json({error:'Profile name must be 3–24 letters, digits, or underscores'});
 const c=await pool.query('SELECT count(*)::int n FROM game_profiles WHERE user_id=$1',[req.user.id]);
 if(c.rows[0].n>=5)return res.status(400).json({error:'Maximum five profiles'});
 const r=await pool.query('INSERT INTO game_profiles(user_id,name,avatar) VALUES($1,$2,$3) RETURNING id,name,avatar',[req.user.id,name,JSON.stringify(req.user.avatar)]);res.json(r.rows[0]);
 }catch(e){if(e.code==='23505')return res.status(409).json({error:'Profile already exists'});fail(res,e)}});
app.post('/api/profiles/activate',auth,async(req,res)=>{try{
 const id=req.body.id===null?null:Number(req.body.id);
 if(id!==null){const p=await pool.query('SELECT 1 FROM game_profiles WHERE id=$1 AND user_id=$2',[id,req.user.id]);if(!p.rowCount)return res.sendStatus(404)}
 await pool.query('UPDATE users SET active_profile_id=$1 WHERE id=$2',[id,req.user.id]);
 const updated=await getUser(req.user.id);
 for(const socket of io.sockets.sockets.values())if(socket.data.user?.id===req.user.id){socket.data.user=updated;if(socket.data.roomId)io.to('room:'+socket.data.roomId).emit('player:identity',{socketId:socket.id,user:displayUser(updated)})}
 res.json(updated);
 }catch(e){fail(res,e)}});
app.get('/api/community/users',auth,async(req,res)=>{try{const q=safe(req.query.q,40);if(q.length<2)return res.json([]);res.json((await pool.query("SELECT id,username,role FROM users WHERE username ILIKE $1 ORDER BY username LIMIT 20",['%'+q+'%'])).rows)}catch(e){fail(res,e)}});
app.post('/api/reports',auth,async(req,res)=>{try{
 const target=Number(req.body.targetId),category=safe(req.body.category,50),details=safe(req.body.details,1000);
 if(!validId(target)||target===req.user.id||!['harassment','bullying','scam','inappropriate','other'].includes(category)||details.length<10)return res.status(400).json({error:'Select a player, category, and provide at least 10 characters'});
 const recent=await pool.query("SELECT count(*)::int AS n FROM player_reports WHERE reporter_id=$1 AND created_at>now()-interval '1 hour'",[req.user.id]);
 if(recent.rows[0].n>=5)return res.status(429).json({error:'Report limit reached; try again later'});
 const row=await pool.query('INSERT INTO player_reports(reporter_id,target_id,category,details) VALUES($1,$2,$3,$4) RETURNING id',[req.user.id,target,category,details]);res.json({id:row.rows[0].id});
 }catch(e){fail(res,e)}});
app.get('/api/mod/reports',auth,staffGuard,async(req,res)=>{try{res.json((await pool.query("SELECT r.*,reporter.username reporter,target.username target,staff.username assigned_name FROM player_reports r LEFT JOIN users reporter ON reporter.id=r.reporter_id LEFT JOIN users target ON target.id=r.target_id LEFT JOIN users staff ON staff.id=r.assigned_to ORDER BY CASE WHEN r.status='open' THEN 0 WHEN r.status='picked' THEN 1 ELSE 2 END,r.created_at DESC LIMIT 150")).rows)}catch(e){fail(res,e)}});
app.patch('/api/mod/reports/:id',auth,staffGuard,async(req,res)=>{try{const status=req.body.status;if(!['picked','resolved','dismissed','open'].includes(status))return res.status(400).json({error:'Invalid status'});const result=await pool.query("UPDATE player_reports SET status=$1,assigned_to=CASE WHEN $1='picked' THEN $2 ELSE assigned_to END,resolved_at=CASE WHEN $1 IN ('resolved','dismissed') THEN now() ELSE NULL END WHERE id=$3 RETURNING *",[status,req.user.id,Number(req.params.id)]);if(!result.rowCount)return res.sendStatus(404);await pool.query('INSERT INTO staff_audit(actor_id,target_id,action,details) VALUES($1,$2,$3,$4)',[req.user.id,result.rows[0].target_id,'report:'+status,JSON.stringify({reportId:result.rows[0].id})]);res.json(result.rows[0])}catch(e){fail(res,e)}});
app.get('/api/mod/users',auth,staffGuard,async(req,res)=>{try{const q=safe(req.query.q,40);res.json((await pool.query("SELECT id,username,coins,role FROM users WHERE username ILIKE $1 ORDER BY username LIMIT 40",['%'+q+'%'])).rows)}catch(e){fail(res,e)}});
app.get('/api/mod/audit',auth,adminGuard,async(req,res)=>{try{res.json((await pool.query('SELECT a.*,u.username actor,t.username target FROM staff_audit a LEFT JOIN users u ON u.id=a.actor_id LEFT JOIN users t ON t.id=a.target_id ORDER BY a.id DESC LIMIT 100')).rows)}catch(e){fail(res,e)}});
app.post('/api/mod/action',auth,staffGuard,async(req,res)=>{const id=Number(req.body.userId),action=req.body.action,reason=safe(req.body.reason,500),amount=Number(req.body.amount);if(!validId(id))return res.status(400).json({error:'Select a valid target player'});if(id===req.user.id&&!(req.user.role==='owner'&&action==='credits'))return res.status(400).json({error:'You cannot perform this action on your own account'});const client=await pool.connect();try{
 await client.query('BEGIN');const target=(await client.query('SELECT id,role FROM users WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!target){await client.query('ROLLBACK');return res.sendStatus(404)}
 if((target.role==='owner'&&!(req.user.role==='owner'&&id===req.user.id&&action==='credits'))||(target.role==='admin'&&req.user.role!=='owner')||(target.role==='moderator'&&req.user.role==='moderator')){await client.query('ROLLBACK');return res.status(403).json({error:'Cannot moderate this staff role'})}
 if(['ban','unban','credits','role'].includes(action)&&!isAdmin(req.user)){await client.query('ROLLBACK');return res.sendStatus(403)}
 if(action==='role'&&req.user.role!=='owner'){await client.query('ROLLBACK');return res.status(403).json({error:'Only owner can assign staff roles'})}
 if(action==='warn'){if(reason.length<3)throw Error('Reason required');await client.query('INSERT INTO player_warnings(user_id,moderator_id,reason) VALUES($1,$2,$3)',[id,req.user.id,reason])}
 else if(action==='ban'){if(reason.length<3)throw Error('Reason required');await client.query('INSERT INTO bans(user_id,reason,expires_at) VALUES($1,$2,NULL) ON CONFLICT(user_id) DO UPDATE SET reason=EXCLUDED.reason,expires_at=NULL',[id,reason])}
 else if(action==='unban'){await client.query('DELETE FROM bans WHERE user_id=$1',[id])}
 else if(action==='credits'){if(!Number.isSafeInteger(amount)||amount===0||Math.abs(amount)>100000)throw Error('Invalid credit adjustment');const result=await client.query('UPDATE users SET coins=coins+$1 WHERE id=$2 AND coins+$1>=0 RETURNING coins',[amount,id]);if(!result.rowCount)throw Error('Insufficient credits')}
 else if(action==='role'){if(!['player','moderator','admin'].includes(req.body.role))throw Error('Invalid role');await client.query('UPDATE users SET role=$1 WHERE id=$2',[req.body.role,id])}
 else throw Error('Unknown action');
 await client.query('INSERT INTO staff_audit(actor_id,target_id,action,details) VALUES($1,$2,$3,$4)',[req.user.id,id,action,JSON.stringify({reason,amount:action==='credits'?amount:undefined,role:action==='role'?req.body.role:undefined})]);
 await client.query('COMMIT');
 for(const socket of io.sockets.sockets.values())if(socket.data.user?.id===id){
 if(action==='ban')socket.disconnect(true);
 else if(action==='warn')socket.emit('moderation:warning',{reason});
 else if(action==='credits'||action==='role'){socket.data.user=await getUser(id);socket.emit('account:changed',{action,coins:socket.data.user.coins});if(action==='role'&&socket.data.roomId)io.to('room:'+socket.data.roomId).emit('player:identity',{socketId:socket.id,user:displayUser(socket.data.user)})}
 }
 res.json({ok:true,coins:action==='credits'?(await getUser(id)).coins:undefined});
 }catch(e){await client.query('ROLLBACK');res.status(400).json({error:e.message})}finally{client.release()}});
app.get('/api/trades',auth,async(req,res)=>{try{res.json((await pool.query("SELECT t.*,a.username sender,b.username recipient FROM furniture_trades t JOIN users a ON a.id=t.sender_id JOIN users b ON b.id=t.recipient_id WHERE t.sender_id=$1 OR t.recipient_id=$1 ORDER BY t.id DESC LIMIT 60",[req.user.id])).rows)}catch(e){fail(res,e)}});
app.post('/api/trades',auth,async(req,res)=>{try{
 const recipient=Number(req.body.recipientId),offered=tradeItems(req.body.offered),requested=tradeItems(req.body.requested);
 if(!validId(recipient)||recipient===req.user.id||!offered||!requested||!Object.keys(offered).length&&!Object.keys(requested).length)return res.status(400).json({error:'Invalid trade'});
 const exists=await pool.query('SELECT 1 FROM users WHERE id=$1',[recipient]);if(!exists.rowCount)return res.sendStatus(404);
 const pending=await pool.query("SELECT count(*)::int AS n FROM furniture_trades WHERE sender_id=$1 AND status='pending'",[req.user.id]);if(pending.rows[0].n>=10)return res.status(429).json({error:'Too many pending trades'});
 const result=await pool.query('INSERT INTO furniture_trades(sender_id,recipient_id,offered,requested) VALUES($1,$2,$3,$4) RETURNING id',[req.user.id,recipient,JSON.stringify(offered),JSON.stringify(requested)]);res.json({id:result.rows[0].id});
 }catch(e){fail(res,e)}});
app.post('/api/trades/:id/decision',auth,async(req,res)=>{const decision=req.body.decision;if(!['accept','decline','cancel'].includes(decision))return res.status(400).json({error:'Invalid decision'});const client=await pool.connect();try{
 await client.query('BEGIN');const trade=(await client.query('SELECT * FROM furniture_trades WHERE id=$1 FOR UPDATE',[Number(req.params.id)])).rows[0];
 if(!trade||trade.status!=='pending')throw Error('Trade no longer pending');
 if(decision==='cancel'?trade.sender_id!==req.user.id:trade.recipient_id!==req.user.id)throw Error('Not authorized');
 if(decision==='accept'){
  // Serialize transfers across all trades for either account.
  const ids=[trade.sender_id,trade.recipient_id].sort((a,b)=>a-b);
  await client.query('SELECT id FROM users WHERE id=ANY($1::int[]) ORDER BY id FOR UPDATE',[ids]);
  for(const [owner,items] of [[trade.sender_id,trade.offered],[trade.recipient_id,trade.requested]]){
   for(const [kind,quantity] of Object.entries(items)){const r=await client.query('SELECT quantity FROM inventory WHERE user_id=$1 AND kind=$2 FOR UPDATE',[owner,kind]);if(!r.rowCount||r.rows[0].quantity<quantity)throw Error('Trade failed: one player no longer owns enough furniture')}
  }
  for(const [from,to,items] of [[trade.sender_id,trade.recipient_id,trade.offered],[trade.recipient_id,trade.sender_id,trade.requested]]){
   for(const [kind,quantity] of Object.entries(items)){await client.query('UPDATE inventory SET quantity=quantity-$1 WHERE user_id=$2 AND kind=$3',[quantity,from,kind]);await client.query('INSERT INTO inventory(user_id,kind,quantity) VALUES($1,$2,$3) ON CONFLICT(user_id,kind) DO UPDATE SET quantity=inventory.quantity+EXCLUDED.quantity',[to,kind,quantity])}
  }
 }
 await client.query('UPDATE furniture_trades SET status=$1,updated_at=now() WHERE id=$2',[decision==='accept'?'completed':decision==='decline'?'declined':'cancelled',trade.id]);
 await client.query('COMMIT');
 for(const socket of io.sockets.sockets.values())if([trade.sender_id,trade.recipient_id].includes(socket.data.user?.id))socket.emit('trade:updated',{id:trade.id,status:decision});
 res.json({ok:true});
 }catch(e){await client.query('ROLLBACK');res.status(400).json({error:e.message})}finally{client.release()}});
// Live trading is bound to authenticated sockets. Both sides must lock and confirm.
const liveTrades=new Map(),tradeBySocket=new Map();
const publishTrade=t=>{for(const sid of [t.a,t.b])io.to(sid).emit('liveTrade:state',{id:t.id,partner:sid===t.a?t.bName:t.aName,own:sid===t.a?t.offerA:t.offerB,theirs:sid===t.a?t.offerB:t.offerA,locked:sid===t.a?t.lockA:t.lockB,partnerLocked:sid===t.a?t.lockB:t.lockA,confirmed:sid===t.a?t.confirmA:t.confirmB,partnerConfirmed:sid===t.a?t.confirmB:t.confirmA})};
const endTrade=(t,message)=>{if(!t)return;liveTrades.delete(t.id);for(const sid of [t.a,t.b]){tradeBySocket.delete(sid);io.to(sid).emit('liveTrade:end',{message})}};
const liveSocket=sid=>io.sockets.sockets.get(sid);
const transferLive=async t=>{
 const a=liveSocket(t.a),b=liveSocket(t.b);
 if(!a||!b||a.data.user.id===b.data.user.id)throw Error('Player disconnected');
 const client=await pool.connect();
 try{await client.query('BEGIN');
  const ids=[a.data.user.id,b.data.user.id].sort((x,y)=>x-y);
  await client.query('SELECT id FROM users WHERE id=ANY($1::int[]) ORDER BY id FOR UPDATE',[ids]);
  for(const [uid,items] of [[a.data.user.id,t.offerA],[b.data.user.id,t.offerB]]){
   for(const [kind,qty] of Object.entries(items)){const r=await client.query('SELECT quantity FROM inventory WHERE user_id=$1 AND kind=$2 FOR UPDATE',[uid,kind]);if(!r.rowCount||r.rows[0].quantity<qty)throw Error('Not enough '+kind+' in inventory')}
  }
  for(const [from,to,items] of [[a.data.user.id,b.data.user.id,t.offerA],[b.data.user.id,a.data.user.id,t.offerB]]){
   for(const [kind,qty] of Object.entries(items)){
    await client.query('UPDATE inventory SET quantity=quantity-$1 WHERE user_id=$2 AND kind=$3',[qty,from,kind]);
    await client.query('INSERT INTO inventory(user_id,kind,quantity) VALUES($1,$2,$3) ON CONFLICT(user_id,kind) DO UPDATE SET quantity=inventory.quantity+EXCLUDED.quantity',[to,kind,qty]);
   }
  }
  await client.query('COMMIT');
 }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
};
const furnitureLightStates=new Map();
const roomKickTimeouts=new Map();const occupants=new Map();const positions=new Map();const poses=new Map();
const occupantsFor=id=>[...(occupants.get(id)||new Set())].map(sid=>{const s=io.sockets.sockets.get(sid);return s?{socketId:sid,user:displayUser(s.data.user),x:positions.get(sid)?.x??4,y:positions.get(sid)?.y??4,pose:poses.get(sid)||null,held:s.data.held||null}:null}).filter(Boolean);
const leave=s=>{s.data.held=null;const id=s.data.roomId;if(!id)return;occupants.get(id)?.delete(s.id);positions.delete(s.id);poses.delete(s.id);s.leave(`room:${id}`);io.to(`room:${id}`).emit('player:left',s.id);s.data.roomId=null;};
io.use(async(socket,next)=>{try{const p=jwt.verify(socket.handshake.auth.token,secret);const u=await getUser(p.id);if(!u)return next(new Error('Unauthorized'));const b=await pool.query('SELECT 1 FROM bans WHERE user_id=$1 AND (expires_at IS NULL OR expires_at>now())',[u.id]);if(b.rowCount)return next(new Error('Suspended'));socket.data.user=u;next();}catch{next(new Error('Unauthorized'));}});
io.on('connection',s=>{let lastChat=0,lastMove=0;
 s.on('liveTrade:invite',(targetId,ack=()=>{})=>{
  const target=[...io.sockets.sockets.values()].find(v=>v.data.user?.id===Number(targetId)&&v.id!==s.id);
  if(!target||target.data.roomId!==s.data.roomId||!s.data.roomId)return ack({error:'Player must be in your room'});
  if(tradeBySocket.has(s.id)||tradeBySocket.has(target.id))return ack({error:'One player is already trading'});
  const id=String(Date.now())+'-'+s.id.slice(0,6),t={id,a:s.id,b:target.id,aName:displayUser(s.data.user).username,bName:displayUser(target.data.user).username,offerA:{},offerB:{},lockA:false,lockB:false,confirmA:false,confirmB:false,accepted:false};
  liveTrades.set(id,t);tradeBySocket.set(s.id,id);tradeBySocket.set(target.id,id);
  target.emit('liveTrade:invite',{id,from:t.aName});
  ack({ok:true});
 });
 s.on('liveTrade:respond',(accept,ack=()=>{})=>{
  const t=liveTrades.get(tradeBySocket.get(s.id));if(!t||t.b!==s.id||t.accepted)return ack({error:'No pending invitation'});
  if(!accept){endTrade(t,'Trade declined');return ack({ok:true})}
  t.accepted=true;publishTrade(t);ack({ok:true});
 });
 s.on('liveTrade:offer',(items,ack=()=>{})=>{
  const t=liveTrades.get(tradeBySocket.get(s.id));if(!t?.accepted||t.lockA||t.lockB)return ack({error:'Trade is locked'});
  const parsed=tradeItems(items);if(!parsed)return ack({error:'Invalid items'});
  if(s.id===t.a)t.offerA=parsed;else t.offerB=parsed;
  t.confirmA=t.confirmB=false;publishTrade(t);ack({ok:true});
 });
 s.on('liveTrade:lock',(_,ack=()=>{})=>{
  const t=liveTrades.get(tradeBySocket.get(s.id));if(!t?.accepted)return ack({error:'No active trade'});
  if(s.id===t.a)t.lockA=true;else t.lockB=true;
  publishTrade(t);ack({ok:true});
 });
 s.on('liveTrade:confirm',async(_,ack=()=>{})=>{
  const t=liveTrades.get(tradeBySocket.get(s.id));if(!t?.accepted||!t.lockA||!t.lockB)return ack({error:'Both players must lock offers first'});
  if(t.settling)return ack({error:'Trade is processing'});
  if(s.id===t.a)t.confirmA=true;else t.confirmB=true;
  if(!t.confirmA||!t.confirmB){publishTrade(t);return ack({ok:true})}
  t.settling=true;
  try{await transferLive(t);endTrade(t,'Trade completed!');ack({ok:true})}
  catch(e){endTrade(t,'Trade failed: '+e.message);ack({error:e.message})}
 });
 s.on('liveTrade:cancel',()=>endTrade(liveTrades.get(tradeBySocket.get(s.id)),'Trade cancelled'));
 s.on('disconnect',()=>endTrade(liveTrades.get(tradeBySocket.get(s.id)),'Other player disconnected'));
 s.on('room:kick',async(targetSocketId,ack=()=>{})=>{
  const roomId=s.data.roomId,target=io.sockets.sockets.get(String(targetSocketId));
  if(!roomId||!target||target.data.roomId!==roomId)return ack({error:'Player is not in this room'});
  try{
   const owner=(await pool.query('SELECT owner_id FROM rooms WHERE id=$1',[roomId])).rows[0]?.owner_id;
   if(owner!==s.data.user.id)return ack({error:'Only the room owner can kick guests'});
   if(target.data.user.id===owner)return ack({error:'Cannot kick the room owner'});
   const key=roomId+':'+target.data.user.id;
   roomKickTimeouts.set(key,Date.now()+10*60*1000);await pool.query("DELETE FROM room_entry_requests WHERE room_id=$1 AND user_id=$2",[roomId,target.data.user.id]);
   if(tradeBySocket.has(target.id))endTrade(liveTrades.get(tradeBySocket.get(target.id)),'Trade cancelled: guest was removed');
   leave(target);target.emit('room:kicked',{reason:'The room owner removed you. You cannot rejoin for 10 minutes.'});
   ack({ok:true}); 
  }catch(e){console.error(e);ack({error:'Could not remove guest'})}
 });
 s.on('room:join',async(id,ack=()=>{})=>{try{if(tradeBySocket.has(s.id))endTrade(liveTrades.get(tradeBySocket.get(s.id)),'Trade cancelled: player changed rooms');id=Number(id);if(!Number.isInteger(id))return ack({error:'Invalid room'});const r=await pool.query("SELECT * FROM rooms WHERE id=$1 AND (is_public OR owner_id=$2 OR EXISTS(SELECT 1 FROM room_entry_requests q WHERE q.room_id=rooms.id AND q.user_id=$2 AND q.status='approved'))",[id,s.data.user.id]);if(!r.rowCount)return ack({error:'Room is locked or unavailable'});const kickKey=id+':'+s.data.user.id;const blockedUntil=roomKickTimeouts.get(kickKey)||0;if(blockedUntil>Date.now()&&r.rows[0].owner_id!==s.data.user.id)return ack({error:'The room owner removed you. Try again in '+Math.ceil((blockedUntil-Date.now())/60000)+' minutes.'});if(blockedUntil&&blockedUntil<=Date.now())roomKickTimeouts.delete(kickKey);leave(s);s.join(`room:${id}`);s.data.roomId=id;if(!occupants.has(id))occupants.set(id,new Set());occupants.get(id).add(s.id);poses.delete(s.id);const furn=(await pool.query('SELECT id,kind,x,y,rotation,stack_height,support_id FROM furniture WHERE room_id=$1 ORDER BY id',[id])).rows;const occupiedTiles=furnitureBlocked(furn);const spawn=([{x:4,y:4},...Array.from({length:100},(_,i)=>({x:i%10,y:Math.floor(i/10)}))]).find(p=>!occupiedTiles.has(p.x+','+p.y))||{x:4,y:4};positions.set(s.id,spawn);const messages=(await pool.query('SELECT m.body,m.created_at,u.username FROM messages m JOIN users u ON u.id=m.user_id WHERE room_id=$1 ORDER BY m.id DESC LIMIT 30',[id])).rows.reverse();ack({room:r.rows[0],furniture:furn,lights:furn.filter(f=>furnitureLightStates.has(id+':'+f.id)).map(f=>({id:f.id,enabled:furnitureLightStates.get(id+':'+f.id)})),players:occupantsFor(id),messages});s.to(`room:${id}`).emit('player:joined',{socketId:s.id,user:displayUser(s.data.user),x:spawn.x,y:spawn.y});}catch(e){console.error(e);ack({error:'Join failed'});}});
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
     const rows=(await pool.query('SELECT id,kind,x,y,rotation,stack_height,support_id FROM furniture WHERE room_id=$1',[roomId])).rows;
     blocked=furnitureBlocked(rows);
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
   let stepping=false;
   const step=async()=>{
     if(stepping)return;
     stepping=true;
     try{
       if(s.data.roomId!==roomId||!s.connected){stopWalking();return;}
       const next=path[index];if(!next){stopWalking();return;}
       // Check every step against the live room state, not just the original route.
       const occupied=await pool.query('SELECT id,kind,x,y,rotation,stack_height,support_id FROM furniture WHERE room_id=$1',[roomId]);
       if(s.data.roomId!==roomId||!s.connected){stopWalking();return;}
       if(furnitureBlocked(occupied.rows).has(next.x+','+next.y)){stopWalking();return;}
       index++;
       positions.set(s.id,next);
       io.to('room:'+roomId).emit('player:moved',{socketId:s.id,x:next.x,y:next.y});
       if(index>=path.length)stopWalking();
     }catch(e){console.error('Walking collision check failed',e);stopWalking();}
     finally{stepping=false;}
   };
   if(path.length){walkTimer=setInterval(step,240);void step();}
 });
 s.on('disconnecting',stopWalking);
 s.on('room:join',stopWalking);
 const seatingKinds=new Set(['chair','sofa','bed','club_sofa','royal_throne','autumn_throne','christmas_sofa']);
 const seatingCapacity=kind=>['sofa','club_sofa','christmas_sofa','bed'].includes(kind)?2:1;
 s.on('player:sit',async(request,ack=()=>{})=>{
   const roomId=s.data.roomId;if(!roomId)return ack({error:'Join a room first'});
   const id=Number(typeof request==='object'?request?.id:request);
   if(!Number.isSafeInteger(id)||id<1)return ack({error:'Invalid seat'});
   try{
     const item=(await pool.query('SELECT id,kind,x,y FROM furniture WHERE id=$1 AND room_id=$2',[id,roomId])).rows[0];
     if(!item||!seatingKinds.has(item.kind))return ack({error:'Not a seat'});
     const current=positions.get(s.id);
     if(!current||Math.abs(current.x-item.x)+Math.abs(current.y-item.y)>5)return ack({error:'Move closer to sit'});
     const used=new Set([...poses.entries()].filter(([sid,pose])=>sid!==s.id&&pose?.seatId===item.id&&io.sockets.sockets.get(sid)?.data.roomId===roomId).map(([,pose])=>pose.slot||0));
     const slot=Array.from({length:seatingCapacity(item.kind)},(_,i)=>i).find(i=>!used.has(i));
     if(slot===undefined)return ack({error:'Seat occupied'});
     stopWalking();
     positions.set(s.id,{x:item.x,y:item.y});
     const pose={type:item.kind==='bed'?'lie':'sit',seatId:item.id,kind:item.kind,slot};
     poses.set(s.id,pose);
     io.to('room:'+roomId).emit('player:moved',{socketId:s.id,x:item.x,y:item.y});
     io.to('room:'+roomId).emit('player:pose',{socketId:s.id,pose});
     ack({ok:true,pose});
   }catch(e){console.error(e);ack({error:'Could not use seat'})}
 });
 s.on('player:stand',async(_,ack=()=>{})=>{
   const roomId=s.data.roomId;if(!roomId)return ack({error:'Not in a room'});
   const current=positions.get(s.id),pose=poses.get(s.id);
   if(!pose)return ack({ok:true});
   try{
     const rows=(await pool.query('SELECT id,kind,x,y,rotation,stack_height,support_id FROM furniture WHERE room_id=$1',[roomId])).rows;
     const blocked=furnitureBlocked(rows);
     const origin=current||{x:4,y:4};
     const candidates=[];
     for(let distance=1;distance<=18;distance++)for(let dx=-distance;dx<=distance;dx++)for(let dy=-distance;dy<=distance;dy++){
       if(Math.abs(dx)+Math.abs(dy)!==distance)continue;
       const x=origin.x+dx,y=origin.y+dy;
       if(x>=0&&x<=9&&y>=0&&y<=9&&!blocked.has(x+','+y))candidates.push({x,y});
     }
     const next=candidates[0];if(!next)return ack({error:'No free floor tile to stand on'});
     positions.set(s.id,next);poses.delete(s.id);
     io.to('room:'+roomId).emit('player:moved',{socketId:s.id,...next});
     io.to('room:'+roomId).emit('player:pose',{socketId:s.id,pose:null});
     ack({ok:true});
   }catch(e){console.error(e);ack({error:'Could not stand'})}
 });
 let lastEmote=0;
 s.on('player:emote',(name,ack=()=>{})=>{
   if(!s.data.roomId||!['wave','dance','laugh','cheer'].includes(name))return ack({error:'Invalid emote'});
   if(Date.now()-lastEmote<800)return ack({error:'Wait a moment'});
   lastEmote=Date.now();io.to('room:'+s.data.roomId).emit('player:emote',{socketId:s.id,name,until:Date.now()+3500});ack({ok:true});
 });
 s.on('chat:send',async(body,ack=()=>{})=>{try{const now=Date.now();if(now-lastChat<900)return ack({error:'Slow down'});lastChat=now;body=safe(body,240);if(!body||!s.data.roomId)return ack({error:'Cannot send'});await pool.query('INSERT INTO messages(room_id,user_id,body) VALUES($1,$2,$3)',[s.data.roomId,s.data.user.id,body]);io.to(`room:${s.data.roomId}`).emit('chat:message',{username:displayUser(s.data.user).username,userId:s.data.user.id,body,socketId:s.id});ack({ok:true});}catch(e){console.error(e);ack({error:'Chat failed'});}});
 s.on('furniture:place',async({kind,x,y,supportId=null}={},ack=()=>{})=>{const id=s.data.roomId;kind=safe(kind,30);x=Number(x);y=Number(y);if(!id||!CATALOG[kind]||!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>9||y>9)return ack({error:'Invalid placement'});const client=await pool.connect();try{await client.query('BEGIN');const owner=await client.query('SELECT owner_id FROM rooms WHERE id=$1',[id]);if(owner.rows[0]?.owner_id!==s.data.user.id){await client.query('ROLLBACK');return ack({error:'Only room owner can decorate'});}const occ=await client.query('SELECT id,kind,x,y,rotation,stack_height,support_id FROM furniture WHERE room_id=$1',[id]);const support=supportId==null?null:validateStack({kind,x,y,rotation:0},occ.rows,supportId);if((supportId!=null&&!support)||(!supportId&&!validFurniturePlacement({kind,x,y,rotation:0},occ.rows))){await client.query('ROLLBACK');return ack({error:supportId?'Cannot stack that item here':'Tile occupied'});}const inv=await client.query('UPDATE inventory SET quantity=quantity-1 WHERE user_id=$1 AND kind=$2 AND quantity>0 RETURNING quantity',[s.data.user.id,kind]);if(!inv.rowCount){await client.query('ROLLBACK');return ack({error:'Item not in inventory'});}const item=(await client.query('INSERT INTO furniture(room_id,owner_id,kind,x,y,stack_height,support_id) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,kind,x,y,rotation,stack_height,support_id',[id,s.data.user.id,kind,x,y,support?36:0,support?.id||null])).rows[0];await client.query('COMMIT');io.to(`room:${id}`).emit('furniture:added',item);ack({ok:true});}catch(e){await client.query('ROLLBACK');console.error(e);ack({error:'Placement failed'});}finally{client.release();}});
 // Interactive consumable dispensers: server chooses the item, never the browser.
 s.on('furniture:dispense',async(itemId,ack=()=>{})=>{
  const roomId=s.data.roomId,id=Number(itemId),now=Date.now();
  if(!roomId||!Number.isSafeInteger(id)||id<1)return ack({error:'Invalid dispenser'});
  if(now-(s.data.lastDispense||0)<1500)return ack({error:'Wait a moment before dispensing again'});
  try{
   const r=await pool.query('SELECT kind,x,y FROM furniture WHERE id=$1 AND room_id=$2',[id,roomId]);
   if(!r.rowCount||!['ice_cream_machine','fridge'].includes(r.rows[0].kind))return ack({error:'This furniture cannot dispense food'});
   const item=r.rows[0],pos=positions.get(s.id);
   if(!pos||Math.abs(pos.x-item.x)+Math.abs(pos.y-item.y)>3)return ack({error:'Move closer to the dispenser'});
   const flavors=['icecream_vanilla','icecream_strawberry','icecream_chocolate'];
   const choices=item.kind==='ice_cream_machine'?flavors:['carrot','blackcurrant','icecream'];
   const choice=choices[Math.floor(Math.random()*choices.length)];
   const held=choice==='icecream'?flavors[Math.floor(Math.random()*flavors.length)]:choice;
   s.data.lastDispense=now;s.data.held=held;
   io.to('room:'+roomId).emit('player:held',{socketId:s.id,held});
   io.to('room:'+roomId).emit('furniture:effect',{id,kind:'dispense',flavor:held,until:now+2400});
   ack({ok:true,held});
  }catch(e){console.error(e);ack({error:'Dispenser unavailable'})}
 });
 s.on('player:dropHeld',(_,ack=()=>{})=>{
  if(!s.data.roomId)return ack({error:'Join a room first'});
  s.data.held=null;io.to('room:'+s.data.roomId).emit('player:held',{socketId:s.id,held:null});ack({ok:true});
 });
 // Move placed furniture without returning it to inventory. Room owner only.
 s.on('furniture:move',async({itemId,x,y}={},ack=()=>{})=>{
  const roomId=s.data.roomId;itemId=Number(itemId);x=Number(x);y=Number(y);
  if(!roomId||!Number.isSafeInteger(itemId)||itemId<1||![x,y].every(v=>Number.isInteger(v)&&v>=0&&v<=9))return ack({error:'Invalid furniture position'});
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   const room=await client.query('SELECT owner_id FROM rooms WHERE id=$1 FOR UPDATE',[roomId]);
   if(room.rows[0]?.owner_id!==s.data.user.id)throw Error('Only the room owner can move furniture');
   const item=await client.query('SELECT id,kind,x,y,rotation,stack_height,support_id FROM furniture WHERE id=$1 AND room_id=$2 AND owner_id=$3 FOR UPDATE',[itemId,roomId,s.data.user.id]);
   if(!item.rowCount)throw Error('Furniture not found');
   if(item.rows[0].support_id)throw Error('Pick up stacked items before moving them');
   const children=await client.query('SELECT 1 FROM furniture WHERE support_id=$1 LIMIT 1',[itemId]);if(children.rowCount)throw Error('Remove stacked items before moving the table');
   const occupied=await client.query('SELECT id,kind,x,y,rotation,stack_height,support_id FROM furniture WHERE room_id=$1',[roomId]);
   if(!validFurniturePlacement({...item.rows[0],x,y},occupied.rows,itemId))throw Error('That tile is occupied');
   const result=await client.query('UPDATE furniture SET x=$1,y=$2 WHERE id=$3 RETURNING id,x,y',[x,y,itemId]);
   await client.query('COMMIT');
   for(const [sid,pose] of poses)if(pose?.seatId===itemId){poses.delete(sid);io.to('room:'+roomId).emit('player:pose',{socketId:sid,pose:null})}
   io.to('room:'+roomId).emit('furniture:moved',result.rows[0]);ack({ok:true});
  }catch(e){await client.query('ROLLBACK');ack({error:e.message})}finally{client.release()}
 });
 // Interactions are validated against actual room furniture and player distance.
 s.on('furniture:interact',async(itemId,ack=()=>{})=>{
  const roomId=s.data.roomId,id=Number(itemId),now=Date.now();
  if(!roomId||!Number.isSafeInteger(id)||id<1)return ack({error:'Invalid furniture'});
  if(now-(s.data.lastInteract||0)<1200)return ack({error:'Please wait a moment'});
  try{
   const item=(await pool.query('SELECT id,kind,x,y FROM furniture WHERE id=$1 AND room_id=$2',[id,roomId])).rows[0];
   if(!item)return ack({error:'Furniture not found'});
   const pos=positions.get(s.id);
   if(!pos||Math.abs(pos.x-item.x)+Math.abs(pos.y-item.y)>3)return ack({error:'Move closer to interact'});
   const kind=item.kind;
   if(kind==='vending_machine'){
    const options=['soda','juice','water'],held=options[Math.floor(Math.random()*options.length)];
    s.data.held=held;s.data.lastInteract=now;
    io.to('room:'+roomId).emit('player:held',{socketId:s.id,held});return ack({ok:true,kind,held});
   }
   if(['lamp','moon_lamp','candy_cane_lamp','christmas_fireplace'].includes(kind)){
    s.data.lastInteract=now;
    const stateKey=roomId+':'+id;
    const enabled=furnitureLightStates.get(stateKey)===false;
    furnitureLightStates.set(stateKey,enabled);
    io.to('room:'+roomId).emit('furniture:light',{id,enabled});
    return ack({ok:true,kind,enabled});
   }
   if(kind==='smoke_machine'){
    s.data.lastInteract=now;io.to('room:'+roomId).emit('furniture:effect',{id,kind:'smoke',until:now+6000});return ack({ok:true,kind});
   }
   if(kind==='door'){
    s.data.lastInteract=now;io.to('room:'+roomId).emit('furniture:effect',{id,kind:'door',until:now+4000});return ack({ok:true,kind});
   }
   if(kind==='teleporter'){
    const other=(await pool.query("SELECT id,x,y FROM furniture WHERE room_id=$1 AND kind='teleporter' AND id<>$2 ORDER BY id LIMIT 1",[roomId,id])).rows[0];
    if(!other)return ack({error:'Place a second teleporter in this room to link them'});
    s.data.lastInteract=now;stopWalking();poses.delete(s.id);
    positions.set(s.id,{x:other.x,y:other.y});
    io.to('room:'+roomId).emit('player:pose',{socketId:s.id,pose:null});
    io.to('room:'+roomId).emit('player:moved',{socketId:s.id,x:other.x,y:other.y});
    io.to('room:'+roomId).emit('furniture:effect',{id,kind:'teleport',until:now+1200});
    io.to('room:'+roomId).emit('furniture:effect',{id:other.id,kind:'teleport',until:now+1200});
    return ack({ok:true,kind});
   }
   ack({error:'This item has no special interaction'});
  }catch(e){console.error(e);ack({error:'Interaction failed'})}
 });
 s.on('furniture:rotate',async(itemId,ack=()=>{})=>{try{
   const roomId=s.data.roomId,id=Number(itemId);
   if(!roomId||!Number.isSafeInteger(id)||id<1)return ack({error:'Invalid furniture'});
   const current=(await pool.query('SELECT id,kind,x,y,rotation,stack_height,support_id FROM furniture WHERE id=$1 AND room_id=$2 AND owner_id=$3',[id,roomId,s.data.user.id])).rows[0];
   if(!current)return ack({error:'Only the room owner can rotate this furniture'});
   const all=(await pool.query('SELECT id,kind,x,y,rotation,stack_height,support_id FROM furniture WHERE room_id=$1',[roomId])).rows;
   if(!validFurniturePlacement({...current,rotation:(current.rotation+1)%4},all,id))return ack({error:'Not enough free space to rotate'});
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
