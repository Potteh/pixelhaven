/* Pixel Haven: reports, staff tools and secure furniture trade client */
(()=>{
const $=s=>document.querySelector(s),el=(tag,txt)=>{const x=document.createElement(tag);if(txt!==undefined)x.textContent=txt;return x};
const api=async(path,method='GET',data)=>{const r=await fetch('/api'+path,{method,headers:{Authorization:'Bearer '+localStorage.getItem('pixel_token'),'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});const j=await r.json();if(!r.ok)throw Error(j.error||'Request failed');return j};
const shell=el('section');shell.className='communityPanel';shell.hidden=true;shell.innerHTML='<header class="communityHead"><strong>🛡️ Hotel Safety & Trading</strong><button type="button" id="communityClose">✕</button></header><nav class="communityTabs"><button data-community="report">Report</button><button data-community="trade">Trade</button><button data-community="staff">Mod Tools</button></nav><div id="communityBody"></div>';
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
async function select(tab){current=tab;tabs.forEach(x=>x.classList.toggle('active',x.dataset.community===tab));body.replaceChildren();if(tab==='report')await report();if(tab==='trade')await trade();if(tab==='staff')await staff()}
launcher.onclick=()=>open();shell.querySelector('#communityClose').onclick=()=>shell.hidden=true;tabs.forEach(b=>b.onclick=()=>select(b.dataset.community));
async function users(search){return api('/community/users?q='+encodeURIComponent(search))}
function playerSearch(label){const wrap=el('div');const q=input('search','Search username (2+ characters)'),select=el('select');const placeholder=()=>{const option=el('option','Select a player');option.value='';option.disabled=true;option.selected=true;return option};select.append(placeholder());let timer=0;q.oninput=()=>{clearTimeout(timer);timer=setTimeout(async()=>{try{const list=await users(q.value);select.replaceChildren(placeholder());for(const u of list){const opt=el('option',u.username+' · '+u.role);opt.value=u.id;select.append(opt)}}catch{}},300)};wrap.append(field(label,q),select);return {wrap,select}}
async function report(){const p=playerSearch('Report a player');const category=el('select');for(const name of ['harassment','bullying','scam','inappropriate','other']){const o=el('option',name);o.value=name;category.append(o)}const details=el('textarea');details.placeholder='Describe what happened (at least 10 characters)';details.rows=5;body.append(el('h3','Submit a player report'),p.wrap,field('Category',category),field('Details',details),button('Send Report',async()=>{try{const r=await api('/reports','POST',{targetId:Number(p.select.value),category:category.value,details:details.value});body.replaceChildren();status('Report #'+r.id+' submitted to hotel staff')}catch(e){status(e.message)}}))}
const kinds=['chair','sofa','table','plant','lamp','bed','arcade','club_sofa','royal_throne','ice_cream_machine','fridge','vending_machine','teleporter','door','smoke_machine','christmas_tree','christmas_sofa','christmas_fireplace','snowman','gift_stack','candy_cane_lamp','festive_rug','gold_bar','nickel','quarter'];
const denomination={gold_bar:1000,nickel:5,quarter:25};
function itemRows(title){const box=el('div');box.className='tradeOffer';box.append(el('h4',title));const lines=el('div');box.append(lines);const add=button('+ Add item',()=>{const row=el('div');row.className='tradeLine';const kind=el('select');for(const k of kinds){const o=el('option',k.replaceAll('_',' ')+(denomination[k]?' ('+denomination[k]+' coins)':''));o.value=k;kind.append(o)}const qty=input('number');qty.min=1;qty.max=99;qty.value=1;row.append(kind,qty,button('×',()=>row.remove()));lines.append(row)});box.append(add);add.onclick();return {box,read:()=>[...lines.children].map(r=>({kind:r.querySelector('select').value,quantity:Number(r.querySelector('input').value)}))}}
async function trade(){const p=playerSearch('Trade with');const offer=itemRows('You give'),request=itemRows('You receive');body.append(el('h3','🤝 Furniture Exchange'),el('p','Both players must own the items when the trade is accepted. Coin tokens are tradeable inventory items.'),p.wrap,offer.box,request.box,button('Propose Trade',async()=>{try{const r=await api('/trades','POST',{recipientId:Number(p.select.value),offered:offer.read(),requested:request.read()});status('Trade #'+r.id+' sent');await showTrades()}catch(e){status(e.message)}}));const list=el('div');body.append(list);
 async function showTrades(){const trades=await api('/trades');list.replaceChildren(el('h4','Trade offers'));for(const t of trades){const row=el('article');row.className='communityCase';row.append(el('strong','#'+t.id+' · '+t.sender+' ↔ '+t.recipient+' · '+t.status));row.append(el('p','Offered: '+JSON.stringify(t.offered)+' | Requested: '+JSON.stringify(t.requested)));if(t.status==='pending'){const incoming=Number(t.recipient_id)===Number(user.id);for(const action of incoming?['accept','decline']:['cancel'])row.append(button(action,async()=>{try{await api('/trades/'+t.id+'/decision','POST',{decision:action});await showTrades()}catch(e){status(e.message)}}))}list.append(row)}}await showTrades()}
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
async function staff(){if(!['owner','admin','moderator'].includes(user.role)){status('Staff access required');return}const reportList=el('div');body.append(el('h3','📋 Issue Browser'),button('Refresh reports',refresh),reportList);
async function refresh(){try{const reports=await api('/mod/reports');reportList.replaceChildren();for(const r of reports){const row=el('article');row.className='communityCase';row.append(el('strong','#'+r.id+' · '+r.category+' · '+r.status),el('p','Reporter: '+r.reporter+' | Player: '+r.target),el('p',r.details));for(const action of ['picked','resolved','dismissed'])row.append(button(action,async()=>{try{await api('/mod/reports/'+r.id,'PATCH',{status:action});await refresh()}catch(e){status(e.message)}}));reportList.append(row)}}catch(e){status(e.message)}}await refresh();await staffChatLogs();
const p=playerSearch('Find player');const reason=input('text','Reason for action');const amount=input('number','Credits adjustment');const role=el('select');for(const r of ['player','moderator','admin']){const o=el('option',r);o.value=r;role.append(o)}
body.append(el('h3','👤 Player Management'),p.wrap,field('Reason',reason));if(user.role==='owner'){const self=button('Select my account',()=>{let option=[...p.select.options].find(o=>o.value===String(user.id));if(!option){option=el('option',user.username+' · owner (you)');option.value=String(user.id);p.select.append(option)}p.select.value=String(user.id)});body.append(self)}
const actions=el('div');actions.className='communityActions';body.append(actions);
async function act(action,extra={}){try{const targetId=Number(p.select.value);if(!p.select.value||!Number.isSafeInteger(targetId)||targetId<=0)throw Error('Search for and select a player first.');if(action==='credits'&&(!Number.isSafeInteger(extra.amount)||extra.amount===0))throw Error('Enter a nonzero whole-number credit adjustment.');const result=await api('/mod/action','POST',{userId:targetId,action,reason:reason.value,...extra});if(action==='credits'){status('Credits updated. New balance: 🪙 '+result.coins);if(targetId===user.id){user.coins=result.coins;await window.pixelRefreshCoins?.()}}else status(action+' completed')}catch(e){status(e.message)}}
actions.append(button('⚠️ Warn',()=>act('warn')));
if(['admin','owner'].includes(user.role)){actions.append(button('⛔ Ban',()=>act('ban')),button('Unban',()=>act('unban')));body.append(field('Credit amount (positive or negative)',amount));actions.append(button('Adjust credits',()=>act('credits',{amount:Number(amount.value)})))}
if(user.role==='owner'){body.append(field('Assign role',role));actions.append(button('Set role',()=>act('role',{role:role.value})))}
}
document.querySelectorAll('[data-game-action]').forEach(b=>b.addEventListener('click',async()=>{const action=b.dataset.gameAction;if(action==='rooms')document.getElementById('navigatorOpen')?.click();else if(action==='shop')document.getElementById('shopOpen')?.click();else if(action==='bag'||action==='avatar'){if(document.getElementById('hotelHub')?.hidden)document.getElementById('hubOpen')?.click();document.getElementById(action==='bag'?'hubTabInventory':'hubTabAvatar')?.click()}else if(['trade','report','staff'].includes(action))await open(action==='trade'?'trade':action)}));
me().catch(()=>{});
window.pixelCommunity={open};
})();
