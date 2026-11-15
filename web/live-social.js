/* Pixel Haven game profiles and real-time trade dialog */
(()=>{
const $=q=>document.querySelector(q);
const api=async(path,method='GET',body)=>{const r=await fetch('/api'+path,{method,headers:{Authorization:'Bearer '+localStorage.getItem('pixel_token'),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const j=await r.json();if(!r.ok)throw Error(j.error||'Request failed');return j};
const panel=document.createElement('section');panel.className='liveGamePanel';panel.hidden=true;document.body.append(panel);
const el=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e};
const button=(text,fn)=>{const b=el('button',text);b.type='button';b.onclick=fn;return b};
const status=text=>{const p=el('p',text);p.className='liveStatus';panel.append(p)};
const show=title=>{panel.replaceChildren();panel.hidden=false;const bar=el('header');bar.className='liveHeader';bar.append(el('strong',title),button('✕',()=>{if(mode==='trade')socket?.emit('liveTrade:cancel');panel.hidden=true}));panel.append(bar)};
let mode='',state=null;
async function profiles(){
 mode='profiles';show('👥 Game Profiles');
 try{
 const current=await api('/me'),list=await api('/profiles');
 panel.append(el('p','One login can have up to five game identities. All profiles share account coins, furniture and staff permissions.'));
 const options=[{id:null,name:current.username+' (main profile)'},...list];
 for(const p of options){
  const row=el('div');row.className='liveRow';row.append(el('span',p.name+(current.active_profile_id===p.id?' ✓ Active':'')));
  row.append(button('Use Profile',async()=>{try{await api('/profiles/activate','POST',{id:p.id});location.reload()}catch(e){status(e.message)}}));panel.append(row);
 }
 if(list.length<5){
  const form=el('form');form.className='liveRow';const name=el('input');name.placeholder='New profile name';name.maxLength=24;name.required=true;const create=el('button','Create Profile');form.append(name,create);
  form.onsubmit=async e=>{e.preventDefault();try{await api('/profiles','POST',{name:name.value});profiles()}catch(err){status(err.message)}};panel.append(form);
 }
 }catch(e){status(e.message)}
}
const kinds=['chair','sofa','table','plant','lamp','bed','arcade','club_sofa','royal_throne','ice_cream_machine','smoke_machine','christmas_tree','christmas_sofa','christmas_fireplace','snowman','gift_stack','candy_cane_lamp','festive_rug','gold_bar','nickel','quarter'];
const sock=()=>typeof socket!=='undefined'&&socket?.connected?socket:null;
const emit=(event,data)=>new Promise((resolve,reject)=>{const s=sock();if(!s)return reject(Error('Not connected'));s.emit(event,data,result=>result?.error?reject(Error(result.error)):resolve(result))});
async function trade(){
 mode='trade';show('🤝 Live Furniture Trading');
 panel.append(el('p','Choose a player currently in your room to invite. Both players lock their offers, then both confirm.'));
 const select=el('select');const initial=el('option','Select player');initial.value='';select.append(initial);
 if(typeof players!=='undefined')for(const p of players.values())if(Number(p.user?.id)!==Number(me?.id)){const opt=el('option',p.user.username);opt.value=p.user.id;select.append(opt)}
 panel.append(select,button('Invite to Trade',async()=>{try{await emit('liveTrade:invite',Number(select.value));status('Invitation sent. Waiting for response…')}catch(e){status(e.message)}}));
}
const labelKind=k=>k.replaceAll('_',' ').replace(/\\b\\w/g,c=>c.toUpperCase());
const owned=new Map(),draft=new Map();
let loadingInventory=false,offerBusy=false;
function furnitureTile(kind,quantity,clickable=false,selected=false){
 const tile=el(clickable?'button':'div');tile.className='tradeFurnitureTile'+(selected?' selected':'');tile.title=labelKind(kind);
 const art=el('canvas');art.width=128;art.height=128;art.className='tradeFurnitureArt';
 const fallback=el('span',kind==='gold_bar'?'🏅':kind==='quarter'?'🪙':kind==='nickel'?'🥉':'📦');fallback.className='tradeFurnitureFallback';
 const name=el('small',labelKind(kind)),qty=el('b','×'+quantity);
 tile.append(art,fallback,name,qty);
 if(typeof window.drawFurniturePreview==='function'){window.drawFurniturePreview(art,kind);fallback.hidden=true}
 return tile;
}
function displaySlots(container,items,emptyText){
 const grid=el('div');grid.className='tradeSlotGrid';container.append(grid);
 const entries=Object.entries(items||{}).filter(([,qty])=>Number(qty)>0);
 for(const [kind,qty] of entries)grid.append(furnitureTile(kind,qty));
 for(let i=entries.length;i<8;i++){const slot=el('div');slot.className='tradeEmptySlot';grid.append(slot)}
 if(!entries.length)container.append(el('p',emptyText));
}
async function loadTradeInventory(){
 loadingInventory=true;
 try{const items=await api('/inventory');owned.clear();for(const item of items)if(item.quantity>0)owned.set(item.kind,item.quantity)}
 catch(e){status('Inventory unavailable: '+e.message)}
 finally{loadingInventory=false;if(state&&mode==='trade')renderTrade()}
}
function renderTrade(){
 if(!state)return;
 mode='trade';show('🤝 Trading with '+state.partner);
 const columns=el('div');columns.className='liveTradeColumns';const yours=el('section'),theirs=el('section');
 yours.append(el('h3','Your offer'));
 theirs.append(el('h3',state.partner+' offers'));
 displaySlots(yours,state.own,'Nothing offered yet');
 displaySlots(theirs,state.theirs,'Waiting for their offer');
 columns.append(yours,theirs);panel.append(columns);
 const locked=state.locked||state.partnerLocked;
 const inventorySection=el('section');inventorySection.className='tradeInventorySection';
 inventorySection.append(el('h3','🎒 Your furniture inventory'));
 const hint=el('p',locked?'Offers are locked. No further changes allowed.':'Select furniture below, choose quantities, then update your offer.');
 inventorySection.append(hint);
 const inventoryGrid=el('div');inventoryGrid.className='tradeInventoryGrid';inventorySection.append(inventoryGrid);
 const drawInventory=()=>{
  inventoryGrid.replaceChildren();
  for(const [kind,available] of owned){
   const selected=draft.get(kind)||0;
   const item=furnitureTile(kind,available,true,selected>0);item.disabled=locked||offerBusy;
   item.onclick=()=>{const next=selected>=Math.min(available,99)?0:selected+1;if(next)draft.set(kind,next);else draft.delete(kind);drawInventory()};
   inventoryGrid.append(item);
  }
  if(!owned.size)inventoryGrid.append(el('p',loadingInventory?'Loading furniture…':'Your inventory is empty.'));
 };
 drawInventory();
 panel.append(inventorySection);
 const summary=el('div');summary.className='tradeOfferSummary';panel.append(summary);
 const drawSummary=()=>{
  summary.replaceChildren();
  summary.append(el('strong','Selected items'));
  if(!draft.size)summary.append(el('p','Select an item to add it to your offer.'));
  for(const [kind,qty] of draft){
   const row=el('div');row.className='tradeQuantityRow';
   const title=el('span',labelKind(kind));
   const minus=button('−',()=>{if(qty<=1)draft.delete(kind);else draft.set(kind,qty-1);drawSummary();drawInventory()});
   const count=el('strong',String(qty));
   const plus=button('+',()=>{draft.set(kind,Math.min(99,owned.get(kind)||0,qty+1));drawSummary();drawInventory()});
   minus.disabled=locked;plus.disabled=locked||qty>=Math.min(99,owned.get(kind)||0);
   row.append(title,minus,count,plus);summary.append(row);
  }
 };
 drawSummary();
 if(!locked){
  const update=button('📤 Update My Offer',async()=>{
   offerBusy=true;update.disabled=true;
   try{await emit('liveTrade:offer',[...draft].map(([kind,quantity])=>({kind,quantity})))}
   catch(e){status(e.message)}
   finally{offerBusy=false;update.disabled=false}
  });panel.append(update);
 }
 const flags=el('p','You: '+(state.locked?'🔒 Locked':'Editing')+' · '+state.partner+': '+(state.partnerLocked?'🔒 Locked':'Editing'));flags.className='tradeLockStatus';panel.append(flags);
 if(!state.locked)panel.append(button('🔒 Lock My Offer',async()=>{try{await emit('liveTrade:lock',null)}catch(e){status(e.message)}}));
 if(state.locked&&state.partnerLocked){
  panel.append(el('p','Review both sets of furniture above. The transfer is permanent once both players confirm.'));
  const confirm=button(state.confirmed?'✓ Waiting for partner':'✓ Confirm Trade',async()=>{confirm.disabled=true;try{await emit('liveTrade:confirm',null)}catch(e){status(e.message);confirm.disabled=false}});
  confirm.disabled=state.confirmed;confirm.className='tradeConfirm';panel.append(confirm);
 }
 panel.append(button('Cancel Trade',()=>sock()?.emit('liveTrade:cancel')));
}
function installSocket(){
 const s=sock();if(!s||s.__pixelLiveTrade)return;s.__pixelLiveTrade=true;
 s.on('liveTrade:invite',async info=>{mode='trade';show('🤝 Trade invitation');panel.append(el('p',info.from+' wants to trade with you.'));panel.append(button('Accept',async()=>{try{await emit('liveTrade:respond',true)}catch(e){status(e.message)}}),button('Decline',()=>s.emit('liveTrade:respond',false)))});
 s.on('liveTrade:state',data=>{const first=!state||state.id!==data.id;state=data;if(first){draft.clear();for(const [kind,qty] of Object.entries(data.own||{}))draft.set(kind,qty);loadTradeInventory()}renderTrade()});
 s.on('liveTrade:end',data=>{state=null;draft.clear();owned.clear();if(mode==='trade'){show('🤝 Trading');status(data.message);if(typeof loadInventory==='function')loadInventory().catch(()=>{})}});
}
document.addEventListener('click',e=>{const action=e.target.closest('[data-game-action]')?.dataset.gameAction;if(action==='profiles')profiles();if(action==='live-trade'){installSocket();trade()}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){if(mode==='trade')sock()?.emit('liveTrade:cancel');panel.hidden=true}});
const watcher=setInterval(()=>{if(sock())installSocket()},1500);
})();
