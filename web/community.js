/* Pixel Haven: reports, staff tools and secure furniture trade client */
(()=>{
const $=s=>document.querySelector(s),el=(tag,txt)=>{const x=document.createElement(tag);if(txt!==undefined)x.textContent=txt;return x};
const api=async(path,method='GET',data)=>{const r=await fetch('/api'+path,{method,headers:{Authorization:'Bearer '+localStorage.getItem('pixel_token'),'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});const j=await r.json();if(!r.ok)throw Error(j.error||'Request failed');return j};
const shell=el('section');shell.className='communityPanel';shell.hidden=true;shell.innerHTML='<header class="communityHead"><strong>🛡️ Friends, Safety & Trading</strong><button type="button" id="communityClose">✕</button></header><nav class="communityTabs"><button data-community="social">Friends</button><button data-community="report">Report</button><button data-community="trade">Trade</button><button data-community="staff">Mod Tools</button></nav><div id="communityBody"></div>';
document.body.append(shell);
const launcher=document.getElementById('communityOpen');
const body=shell.querySelector('#communityBody'),tabs=[...shell.querySelectorAll('[data-community]')];
const status=msg=>{const p=el('p',msg);p.className='communityStatus';body.append(p)};
const field=(label,control)=>{const w=el('label',label);w.append(control);return w};
const input=(type='text',placeholder='')=>{const x=el('input');x.type=type;x.placeholder=placeholder;return x};
const button=(txt,fn)=>{const b=el('button',txt);b.type='button';b.onclick=fn;return b};
let current='report',user=null;
async function me(){user=await api('/me');const staff=['owner','admin','moderator'].includes(user.role);tabs.find(x=>x.dataset.community==='staff').hidden=!staff;const shortcut=document.getElementById('gameStaffShortcut');if(shortcut)shortcut.hidden=!staff}
async function open(tab='report'){shell.hidden=false;try{await me();await select(tab)}catch(e){body.replaceChildren();status(e.message)}}
async function select(tab){current=tab;tabs.forEach(x=>x.classList.toggle('active',x.dataset.community===tab));body.replaceChildren();if(tab==='social')await social();if(tab==='report')await report();if(tab==='trade')await trade();if(tab==='staff')await staff()}
launcher.onclick=()=>open();shell.querySelector('#communityClose').onclick=()=>shell.hidden=true;tabs.forEach(b=>b.onclick=()=>select(b.dataset.community));
async function users(search){return api('/community/users?q='+encodeURIComponent(search))}
function playerSearch(label){const wrap=el('div');const q=input('search','Search username (2+ characters)'),select=el('select');const placeholder=()=>{const option=el('option','Select a player');option.value='';option.disabled=true;option.selected=true;return option};select.append(placeholder());let timer=0;q.oninput=()=>{clearTimeout(timer);timer=setTimeout(async()=>{try{const list=await users(q.value);select.replaceChildren(placeholder());for(const u of list){const opt=el('option',u.username+' · '+u.role);opt.value=u.id;select.append(opt)}}catch{}},300)};wrap.append(field(label,q),select);return {wrap,select}}
async function report(){const p=playerSearch('Report a player');const category=el('select');for(const name of ['harassment','bullying','scam','inappropriate','other']){const o=el('option',name);o.value=name;category.append(o)}const details=el('textarea');details.placeholder='Describe what happened (at least 10 characters)';details.rows=5;body.append(el('h3','Submit a player report'),p.wrap,field('Category',category),field('Details',details),button('Send Report',async()=>{try{const r=await api('/reports','POST',{targetId:Number(p.select.value),category:category.value,details:details.value});body.replaceChildren();status('Report #'+r.id+' submitted to hotel staff')}catch(e){status(e.message)}}))}
const kinds=['chair','sofa','table','plant','lamp','bed','arcade','club_sofa','royal_throne','ice_cream_machine','fridge','vending_machine','teleporter','door','smoke_machine','christmas_tree','christmas_sofa','christmas_fireplace','snowman','gift_stack','candy_cane_lamp','festive_rug','gold_bar','nickel','quarter'];
const denomination={gold_bar:1000,nickel:5,quarter:25};
function itemRows(title){const box=el('div');box.className='tradeOffer';box.append(el('h4',title));const lines=el('div');box.append(lines);const add=button('+ Add item',()=>{const row=el('div');row.className='tradeLine';const kind=el('select');for(const k of kinds){const o=el('option',k.replaceAll('_',' ')+(denomination[k]?' ('+denomination[k]+' coins)':''));o.value=k;kind.append(o)}const qty=input('number');qty.min=1;qty.max=99;qty.value=1;row.append(kind,qty,button('×',()=>row.remove()));lines.append(row)});box.append(add);add.onclick();return {box,read:()=>[...lines.children].map(r=>({kind:r.querySelector('select').value,quantity:Number(r.querySelector('input').value)}))}}
async function trade(){const p=playerSearch('Trade with');const offer=itemRows('You give'),request=itemRows('You receive');body.append(el('h3','🤝 Furniture Exchange'),el('p','Both players must own the items when the trade is accepted. Coin tokens are tradeable inventory items.'),p.wrap,offer.box,request.box,button('Propose Trade',async()=>{try{const r=await api('/trades','POST',{recipientId:Number(p.select.value),offered:offer.read(),requested:request.read()});status('Trade #'+r.id+' sent');await showTrades()}catch(e){status(e.message)}}));const list=el('div');body.append(list);
 async function showTrades(){const trades=await api('/trades');list.replaceChildren(el('h4','Trade offers'));for(const t of trades){const row=el('article');row.className='communityCase';row.append(el('strong','#'+t.id+' · '+t.sender+' ↔ '+t.recipient+' · '+t.status));row.append(el('p','Offered: '+JSON.stringify(t.offered)+' | Requested: '+JSON.stringify(t.requested)));if(t.status==='pending'){const incoming=Number(t.recipient_id)===Number(user.id);for(const action of incoming?['accept','decline']:['cancel'])row.append(button(action,async()=>{try{await api('/trades/'+t.id+'/decision','POST',{decision:action});await showTrades()}catch(e){status(e.message)}}))}list.append(row)}}await showTrades()}

let socialFriend=null,socialTimer=null;
let previousIncoming=new Set(),notificationsReady=false;
const socialBadge=document.createElement('span');socialBadge.className='socialBadge';socialBadge.hidden=true;
const socialDock=document.querySelector('[data-game-action="social"]');socialDock?.append(socialBadge);
async function refreshSocialBadge(){
 if(!localStorage.getItem('pixel_token'))return;
 const [unread,friends]=await Promise.all([api('/social/unread'),api('/social/friends')]);
 const incoming=friends.filter(f=>f.status==='pending'&&f.direction==='incoming');
 const total=unread.total+incoming.length;
 socialBadge.hidden=!total;socialBadge.textContent=total>99?'99+':String(total);
 if(notificationsReady){for(const f of incoming)if(!previousIncoming.has(String(f.id)))notifySocial('👥 Friend request from '+f.username)}
 previousIncoming=new Set(incoming.map(f=>String(f.id)));notificationsReady=true;
}
function notifySocial(text){
 const n=el('div',text);n.className='socialToast';n.setAttribute('role','status');document.body.append(n);
 n.onclick=()=>{n.remove();open('social').catch(console.warn)};
 setTimeout(()=>n.remove(),5500);
}
async function social(){
 const section=el('section');section.className='socialPanel';body.append(section);
 const notice=el('p');notice.className='communityStatus';section.append(el('h3','👥 Friends & Messages'),notice);
 const p=playerSearch('Find a player');section.append(p.wrap);
 const controls=el('div');controls.className='communityActions';section.append(controls);
 const roster=el('div');section.append(el('h4','Friends & Requests'),roster);
 const blockedList=el('div');section.append(el('h4','Blocked Players'),blockedList);
 const conversation=el('div');conversation.className='socialConversation';section.append(conversation);
 const feedback=e=>{notice.textContent=e?.message||String(e)};
 const run=async(fn)=>{try{await fn();await reload()}catch(e){feedback(e)}};
 controls.append(button('Send Friend Request',()=>run(async()=>{if(!p.select.value)throw Error('Select a player');await api('/social/friends/'+p.select.value,'POST',{action:'request'})})),button('Block Player',()=>run(async()=>{if(!p.select.value)throw Error('Select a player');if(!confirm('Block this player and remove your friendship?'))return;await api('/social/blocks/'+p.select.value,'POST',{action:'block'})})));
 async function messages(){
  conversation.replaceChildren();
  if(!socialFriend)return;
  const friend=socialFriend;
  conversation.append(el('h4','✉️ Messages with '+friend.username));
  const list=el('div');list.className='socialMessages';conversation.append(list);
  const compose=el('form');compose.className='socialCompose';
  const message=input('text','Write a private message');message.maxLength=1000;message.required=true;
  const send=el('button','Send');send.type='submit';compose.append(message,send);conversation.append(compose);
  compose.onsubmit=async e=>{e.preventDefault();send.disabled=true;try{await api('/social/messages/'+friend.id,'POST',{body:message.value});message.value='';await messages()}catch(err){feedback(err)}finally{send.disabled=false}};
  try{
   const data=await api('/social/messages/'+friend.id);
   for(const m of data.messages){
    const row=el('article');row.className='communityCase';
    row.append(el('strong',Number(m.sender_id)===Number(user.id)?'You':friend.username),el('small',new Date(m.created_at).toLocaleString()),el('p',m.body));
    if(Number(m.recipient_id)===Number(user.id))row.append(button('Report message',async()=>{const reason=prompt('Reason for reporting this private message (at least 5 characters)');if(reason===null)return;try{await api('/social/messages/'+m.id+'/report','POST',{reason});feedback('Message reported to hotel staff')}catch(err){feedback(err)}}));
    list.append(row);
   }
   if(!data.messages.length)list.append(el('p','No messages yet.'));await api('/social/messages/'+friend.id+'/read','POST');refreshSocialBadge().catch(()=>{});
   if(data.nextBefore)list.prepend(button('Older messages',async()=>{try{const old=await api('/social/messages/'+friend.id+'?before='+data.nextBefore);for(const m of old.messages){const row=el('article');row.className='communityCase';row.append(el('strong',Number(m.sender_id)===Number(user.id)?'You':friend.username),el('p',m.body));list.prepend(row)}}catch(err){feedback(err)}}));
  }catch(e){feedback(e)}
 }
 async function reload(){
  const [friends,blocks,unread]=await Promise.all([api('/social/friends'),api('/social/blocks'),api('/social/unread')]);
  roster.replaceChildren();blockedList.replaceChildren();
  if(!friends.length)roster.append(el('p','No friends or pending requests yet.'));
  for(const f of friends){
   const row=el('article');row.className='communityCase';
   const count=unread.friends.find(x=>Number(x.friend_id)===Number(f.id))?.unread||0;row.append(el('strong',f.username+' · '+(f.status==='accepted'?(f.online?'🟢 Online':'⚫ Offline'):(f.direction==='incoming'?'Incoming request':'Request sent'))+(count?' · ✉️ '+count+' unread':'')));
   const actions=el('div');actions.className='communityActions';row.append(actions);
   const action=(label,value)=>actions.append(button(label,()=>run(()=>api('/social/friends/'+f.id,'POST',{action:value}))));
   if(f.status==='pending'){if(f.direction==='incoming'){action('Accept','accept');action('Decline','decline')}else action('Cancel request','remove')}
   else{
    actions.append(button('Message',async()=>{socialFriend=f;await messages()}));
    if(f.online&&f.roomId)actions.append(button('Join Room',async()=>{try{const rooms=await api('/rooms');const target=rooms.find(r=>Number(r.id)===Number(f.roomId));if(!target)throw Error('Room not found');if(!target.is_public&&Number(target.owner_id)!==Number(user.id)){await api('/rooms/'+target.id+'/request-entry','POST');feedback('Locked room: entry requested from the owner');return}if(typeof window.join!=='function')throw Error('Room joining is not ready');shell.hidden=true;window.join(target.id)}catch(e){feedback(e)}}));
    action('Remove Friend','remove');
   }
   roster.append(row);
  }
  for(const b of blocks){const row=el('article');row.className='communityCase';row.append(el('strong',b.username),button('Unblock',()=>run(()=>api('/social/blocks/'+b.id,'POST',{action:'unblock'}))));blockedList.append(row)}
  if(!blocks.length)blockedList.append(el('p','No blocked players.'));
  if(socialFriend&&!friends.some(f=>Number(f.id)===Number(socialFriend.id)&&f.status==='accepted')){socialFriend=null;conversation.replaceChildren()}
 }
 await reload();
}

async function staffChatLogs(){
 const section=el('section');section.className='staffChatLogs';
 const title=el('h3','💬 Chat Logs');const filters=el('div');filters.className='chatLogFilters';
 const roomId=input('number','Room ID (optional)'),userId=input('number','User ID (optional)'),query=input('search','Search messages');
 roomId.min='1';userId.min='1';query.maxLength=80;
 const results=el('div');results.className='chatLogResults';
 const info=el('p','Staff-only room chat history · newest first');info.className='communityStatus';
 const search=button('Search Chat Logs',()=>load(false)),more=button('Load older messages',()=>load(true));more.hidden=true;
 filters.append(roomId,userId,query,search);
 section.append(title,info,filters,results,more);body.append(section);
 let cursor=null;
 async function load(append){
  if(!append){cursor=null;results.replaceChildren()}
  const params=new URLSearchParams({limit:'50'});
  if(roomId.value)params.set('roomId',roomId.value);
  if(userId.value)params.set('userId',userId.value);
  if(query.value.trim())params.set('q',query.value.trim());
  if(append&&cursor)params.set('before',cursor);
  search.disabled=true;more.disabled=true;
  try{
   const data=await api('/mod/chatlogs?'+params.toString());
   for(const m of data.messages){
    const row=el('article');row.className='communityCase chatLogEntry';
    row.append(el('strong',(m.username||'Deleted user')+' (#'+(m.user_id||'—')+') · '+m.room_name+' (#'+m.room_id+')'));
    row.append(el('small',new Date(m.created_at).toLocaleString()));
    row.append(el('p',m.body));results.append(row);
   }
   if(!data.messages.length&&!append)results.append(el('p','No chat messages match these filters.'));
   cursor=data.nextBefore;more.hidden=!cursor;info.textContent='Staff-only room chat history · newest first';
  }catch(e){info.textContent=e.message}finally{search.disabled=false;more.disabled=false}
 }
 await load(false);
}
async function staffBadges(){
 const section=el('section');section.append(el('h3','🏅 Player Badges'));
 const p=playerSearch('Select player to award a badge');
 const codes=el('select'),list=el('div');list.className='communityActions';
 section.append(p.wrap,field('Badge code',codes),list);
 try{const badges=await api('/badges');for(const b of badges){const o=el('option',b.code+' — '+b.name);o.value=b.code;codes.append(o)}}catch(e){section.append(el('p',e.message))}
 async function act(action){
  try{if(!p.select.value)throw Error('Select a player first');await api('/mod/badges/'+action,'POST',{userId:Number(p.select.value),code:codes.value});section.append(el('p',action==='grant'?'Badge granted':'Badge revoked'))}
  catch(e){section.append(el('p',e.message))}
 }
 list.append(button('Award Badge',()=>act('grant')),button('Revoke Badge',()=>act('revoke')));
 body.append(section);
}
async function staffMessageReports(){
 const section=el('section');section.append(el('h3','✉️ Reported Private Messages'));
 const list=el('div');section.append(list);
 const refresh=async()=>{list.replaceChildren();try{const reports=await api('/mod/message-reports');if(!reports.length)list.append(el('p','No reported private messages.'));for(const r of reports){const row=el('article');row.className='communityCase';row.append(el('strong',r.sender+' → '+r.recipient),el('small',new Date(r.created_at).toLocaleString()),el('p','Reported message: '+r.body),el('p','Reason: '+r.reason));list.append(row)}}catch(e){list.append(el('p',e.message))}};
 section.append(button('Refresh message reports',refresh));body.append(section);await refresh();
}
async function staff(){if(!['owner','admin','moderator'].includes(user.role)){status('Staff access required');return}const reportList=el('div');body.append(el('h3','📋 Issue Browser'),button('Refresh reports',refresh),reportList);
async function refresh(){try{const reports=await api('/mod/reports');reportList.replaceChildren();for(const r of reports){const row=el('article');row.className='communityCase';row.append(el('strong','#'+r.id+' · '+r.category+' · '+r.status),el('p','Reporter: '+r.reporter+' | Player: '+r.target),el('p',r.details));for(const action of ['picked','resolved','dismissed'])row.append(button(action,async()=>{try{await api('/mod/reports/'+r.id,'PATCH',{status:action});await refresh()}catch(e){status(e.message)}}));reportList.append(row)}}catch(e){status(e.message)}}await refresh();await staffChatLogs();await staffMessageReports();if(['admin','owner'].includes(user.role))await staffBadges();
const p=playerSearch('Find player');const reason=input('text','Reason for action');const amount=input('number','Credits adjustment');const role=el('select');for(const r of ['player','moderator','admin']){const o=el('option',r);o.value=r;role.append(o)}
body.append(el('h3','👤 Player Management'),p.wrap,field('Reason',reason));if(user.role==='owner'){const self=button('Select my account',()=>{let option=[...p.select.options].find(o=>o.value===String(user.id));if(!option){option=el('option',user.username+' · owner (you)');option.value=String(user.id);p.select.append(option)}p.select.value=String(user.id)});body.append(self)}
const actions=el('div');actions.className='communityActions';body.append(actions);
async function act(action,extra={}){try{const targetId=Number(p.select.value);if(!p.select.value||!Number.isSafeInteger(targetId)||targetId<=0)throw Error('Search for and select a player first.');if(action==='credits'&&(!Number.isSafeInteger(extra.amount)||extra.amount===0))throw Error('Enter a nonzero whole-number credit adjustment.');const result=await api('/mod/action','POST',{userId:targetId,action,reason:reason.value,...extra});if(action==='credits'){status('Credits updated. New balance: 🪙 '+result.coins);if(targetId===user.id){user.coins=result.coins;await window.pixelRefreshCoins?.()}}else status(action+' completed')}catch(e){status(e.message)}}
actions.append(button('⚠️ Warn',()=>act('warn')));
if(['admin','owner'].includes(user.role)){actions.append(button('⛔ Ban',()=>act('ban')),button('Unban',()=>act('unban')));body.append(field('Credit amount (positive or negative)',amount));actions.append(button('Adjust credits',()=>act('credits',{amount:Number(amount.value)})))}
if(user.role==='owner'){body.append(field('Assign role',role));actions.append(button('Set role',()=>act('role',{role:role.value})))}
}
document.querySelectorAll('[data-game-action]').forEach(b=>b.addEventListener('click',async()=>{const action=b.dataset.gameAction;if(action==='rooms')document.getElementById('navigatorOpen')?.click();else if(action==='shop')document.getElementById('shopOpen')?.click();else if(action==='bag'||action==='avatar'){if(document.getElementById('hotelHub')?.hidden)document.getElementById('hubOpen')?.click();document.getElementById(action==='bag'?'hubTabInventory':'hubTabAvatar')?.click()}else if(['social','trade','report','staff'].includes(action))await open(action==='trade'?'trade':action)}));
window.addEventListener('pixel:authenticated',()=>me().catch(e=>console.warn('Staff menu refresh failed',e)));
me().catch(()=>{});
window.pixelCommunity={open};
window.addEventListener('pixel:authenticated',()=>{if(!shell.hidden&&current==='social')select('social').catch(console.warn)});
window.addEventListener('pixel:social-update',()=>{refreshSocialBadge().catch(console.warn);if(!shell.hidden&&current==='social')select('social').catch(console.warn)});
window.addEventListener('pixel:authenticated',()=>refreshSocialBadge().catch(console.warn));
window.addEventListener('pixel:social-message',()=>{if(shell.hidden)notifySocial('✉️ New private message')});
setInterval(()=>{if(localStorage.getItem('pixel_token'))refreshSocialBadge().catch(()=>{})},30000);
window.pixelShowPlayer=async player=>{
 try{
  if(!user)await me();
  const self=Number(player.id)===Number(user.id);
  await open('social');
  const p=el('article');p.className='socialProfile communityCase';
  p.append(el('h3','👤 '+player.username+(self?' (You)':'')),el('p','Player profile · '+(player.role||'guest')));
  const badgeBox=el('div');badgeBox.className='playerBadges';p.append(badgeBox);
  try{const badges=await api('/users/'+player.id+'/badges');if(!badges.length)badgeBox.append(el('small','No badges yet'));for(const b of badges){const item=el('div');item.className='playerBadge';const img=el('img');img.src=b.image_path;img.alt=b.name;img.title=b.name+' ('+b.code+')';img.onerror=()=>{img.hidden=true;item.append(el('strong',b.code))};item.append(img,el('small',b.name));badgeBox.append(item)}}catch(e){badgeBox.append(el('small',e.message))}

  const controls=el('div');controls.className='communityActions';p.append(controls);
  if(!self)controls.append(button('Find & Add Friend',async()=>{try{await api('/social/friends/'+player.id,'POST',{action:'request'});p.append(el('p','Friend request sent'))}catch(e){p.append(el('p',e.message))}}));
  if(!self){controls.append(button('Message / Friends',()=>select('social')));controls.append(button('Trade',()=>select('trade')))}
  body.prepend(p);
 }catch(e){console.warn(e)}
};

})();
