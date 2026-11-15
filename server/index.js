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
const CATALOG={chair:35,sofa:95,table:65,plant:40,lamp:45,bed:120,arcade:160,club_sofa:240,royal_throne:450,ice_cream_machine:290,fridge:180,vending_machine:210,teleporter:350,door:125,smoke_machine:195,christmas_tree:180,christmas_sofa:175,christmas_fireplace:220,snowman:90,gift_stack:55,candy_cane_lamp:75,festive_rug:65,gold_bar:1000,nickel:5,quarter:25};
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
app.get('/api/rooms',auth,async(req,res)=>{try{res.json((await pool.query('SELECT r.id,r.name,r.description,r.owner_id,r.is_public,u.username AS owner FROM rooms r LEFT JOIN users u ON u.id=r.owner_id WHERE r.is_public OR r.owner_id=$1 ORDER BY r.id LIMIT 100',[req.user.id])).rows);}catch(e){fail(res,e);}});
app.post('/api/rooms',auth,async(req,res)=>{try{const name=safe(req.body.name,64);if(name.length<3)return res.status(400).json({error:'Room name too short'});const count=await pool.query('SELECT count(*)::int AS n FROM rooms WHERE owner_id=$1',[req.user.id]);if(count.rows[0].n>=10)return res.status(400).json({error:'Room limit reached'});const r=await pool.query('INSERT INTO rooms(owner_id,name,description,is_public) VALUES($1,$2,$3,$4) RETURNING *',[req.user.id,name,safe(req.body.description,240),req.body.is_public!==false]);res.json(r.rows[0]);}catch(e){fail(res,e);}});
app.get('/api/catalog',auth,(_req,res)=>res.json(CATALOG));
app.get('/api/inventory',auth,async(req,res)=>{try{res.json((await pool.query('SELECT kind,quantity FROM inventory WHERE user_id=$1',[req.user.id])).rows);}catch(e){fail(res,e);}});
app.post('/api/buy',auth,async(req,res)=>{const kind=safe(req.body.kind,30),price=CATALOG[kind];if(!price)return res.status(400).json({error:'Unknown item'});const client=await pool.connect();try{await client.query('BEGIN');const r=await client.query('UPDATE users SET coins=coins-$1 WHERE id=$2 AND coins >= $1 RETURNING coins',[price,req.user.id]);if(!r.rowCount){await client.query('ROLLBACK');const balance=await client.query('SELECT coins FROM users WHERE id=$1',[req.user.id]);return res.status(400).json({error:'Not enough coins. Available: '+(balance.rows[0]?.coins??0)+'; item price: '+price});}await client.query('INSERT INTO inventory(user_id,kind,quantity) VALUES($1,$2,1) ON CONFLICT(user_id,kind) DO UPDATE SET quantity=inventory.quantity+1',[req.user.id,kind]);await client.query('COMMIT');res.json({coins:r.rows[0].coins});}catch(e){await client.query('ROLLBACK');fail(res,e);}finally{client.release();}});
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

const staffRoles=['moderator','admin','owner'];
const isStaff=u=>staffRoles.includes(u.role);
const isAdmin=u=>['admin','owner'].includes(u.role);
const staffGuard=(req,res,next)=>isStaff(req.user)?next():res.status(403).json({error:'Staff only'});
const adminGuard=(req,res,next)=>isAdmin(req.user)?next():res.status(403).json({error:'Admin only'});
const ownerGuard=(req,res,next)=>req.user.role==='owner'?next():res.status(403).json({error:'Owner only'});
const validId=v=>Number.isSafeInteger(Number(v))&&Number(v)>0;
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
const occupants=new Map();const positions=new Map();const poses=new Map();
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
 s.on('room:join',async(id,ack=()=>{})=>{try{if(tradeBySocket.has(s.id))endTrade(liveTrades.get(tradeBySocket.get(s.id)),'Trade cancelled: player changed rooms');id=Number(id);if(!Number.isInteger(id))return ack({error:'Invalid room'});const r=await pool.query('SELECT * FROM rooms WHERE id=$1 AND (is_public OR owner_id=$2)',[id,s.data.user.id]);if(!r.rowCount)return ack({error:'Room unavailable'});leave(s);s.join(`room:${id}`);s.data.roomId=id;if(!occupants.has(id))occupants.set(id,new Set());occupants.get(id).add(s.id);positions.set(s.id,{x:4,y:4});poses.delete(s.id);const furn=(await pool.query('SELECT id,kind,x,y,rotation FROM furniture WHERE room_id=$1 ORDER BY id',[id])).rows;const messages=(await pool.query('SELECT m.body,m.created_at,u.username FROM messages m JOIN users u ON u.id=m.user_id WHERE room_id=$1 ORDER BY m.id DESC LIMIT 30',[id])).rows.reverse();ack({room:r.rows[0],furniture:furn,players:occupantsFor(id),messages});s.to(`room:${id}`).emit('player:joined',{socketId:s.id,user:displayUser(s.data.user),x:4,y:4});}catch(e){console.error(e);ack({error:'Join failed'});}});
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
   if(!item||!['chair','sofa','bed','club_sofa','royal_throne','christmas_sofa'].includes(item.kind))return ack({error:'Not a seat'});
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
 s.on('chat:send',async(body,ack=()=>{})=>{try{const now=Date.now();if(now-lastChat<900)return ack({error:'Slow down'});lastChat=now;body=safe(body,240);if(!body||!s.data.roomId)return ack({error:'Cannot send'});await pool.query('INSERT INTO messages(room_id,user_id,body) VALUES($1,$2,$3)',[s.data.roomId,s.data.user.id,body]);io.to(`room:${s.data.roomId}`).emit('chat:message',{username:displayUser(s.data.user).username,userId:s.data.user.id,body,socketId:s.id});ack({ok:true});}catch(e){console.error(e);ack({error:'Chat failed'});}});
 s.on('furniture:place',async({kind,x,y}={},ack=()=>{})=>{const id=s.data.roomId;kind=safe(kind,30);x=Number(x);y=Number(y);if(!id||!CATALOG[kind]||!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>9||y>9)return ack({error:'Invalid placement'});const client=await pool.connect();try{await client.query('BEGIN');const owner=await client.query('SELECT owner_id FROM rooms WHERE id=$1',[id]);if(owner.rows[0]?.owner_id!==s.data.user.id){await client.query('ROLLBACK');return ack({error:'Only room owner can decorate'});}const occ=await client.query('SELECT 1 FROM furniture WHERE room_id=$1 AND x=$2 AND y=$3',[id,x,y]);if(occ.rowCount){await client.query('ROLLBACK');return ack({error:'Tile occupied'});}const inv=await client.query('UPDATE inventory SET quantity=quantity-1 WHERE user_id=$1 AND kind=$2 AND quantity>0 RETURNING quantity',[s.data.user.id,kind]);if(!inv.rowCount){await client.query('ROLLBACK');return ack({error:'Item not in inventory'});}const item=(await client.query('INSERT INTO furniture(room_id,owner_id,kind,x,y) VALUES($1,$2,$3,$4,$5) RETURNING id,kind,x,y,rotation',[id,s.data.user.id,kind,x,y])).rows[0];await client.query('COMMIT');io.to(`room:${id}`).emit('furniture:added',item);ack({ok:true});}catch(e){await client.query('ROLLBACK');console.error(e);ack({error:'Placement failed'});}finally{client.release();}});
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
   const item=await client.query('SELECT id FROM furniture WHERE id=$1 AND room_id=$2 AND owner_id=$3 FOR UPDATE',[itemId,roomId,s.data.user.id]);
   if(!item.rowCount)throw Error('Furniture not found');
   const occupied=await client.query('SELECT 1 FROM furniture WHERE room_id=$1 AND x=$2 AND y=$3 AND id<>$4',[roomId,x,y,itemId]);
   if(occupied.rowCount)throw Error('That tile is occupied');
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
