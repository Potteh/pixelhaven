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
function offerInputs(container){
 const wrap=el('div');wrap.className='liveOfferRows';container.append(wrap);
 const add=()=>{const row=el('div');row.className='liveRow';const kind=el('select');for(const k of kinds){const o=el('option',k.replaceAll('_',' '));o.value=k;kind.append(o)}const qty=el('input');qty.type='number';qty.min='1';qty.max='99';qty.value='1';row.append(kind,qty,button('×',()=>row.remove()));wrap.append(row)};
 add();container.append(button('+ Add Furniture',add));
 return ()=>[...wrap.children].map(row=>({kind:row.querySelector('select').value,quantity:Number(row.querySelector('input').value)}));
}
function renderTrade(){
 if(!state)return;mode='trade';show('🤝 Trading with '+state.partner);
 const columns=el('div');columns.className='liveTradeColumns';const yours=el('section'),theirs=el('section');
 yours.append(el('h3','Your offer'),el('p',JSON.stringify(state.own)));
 theirs.append(el('h3',state.partner+' offers'),el('p',JSON.stringify(state.theirs)));
 columns.append(yours,theirs);panel.append(columns);
 const read=offerInputs(yours);
 if(!state.locked&&!state.partnerLocked)panel.append(button('Update Offer',async()=>{try{await emit('liveTrade:offer',read())}catch(e){status(e.message)}}));
 panel.append(el('p','You: '+(state.locked?'🔒 Locked':'Editing')+' · Partner: '+(state.partnerLocked?'🔒 Locked':'Editing')));
 if(!state.locked)panel.append(button('🔒 Lock My Offer',async()=>{try{await emit('liveTrade:lock',null)}catch(e){status(e.message)}}));
 if(state.locked&&state.partnerLocked){panel.append(el('p','Review both offers carefully. Confirming transfers the items permanently once both players agree.'));panel.append(button(state.confirmed?'✓ Waiting for partner':'✓ Confirm Trade',async()=>{try{await emit('liveTrade:confirm',null)}catch(e){status(e.message)}}))}
 panel.append(button('Cancel Trade',()=>sock()?.emit('liveTrade:cancel')));
}
function installSocket(){
 const s=sock();if(!s||s.__pixelLiveTrade)return;s.__pixelLiveTrade=true;
 s.on('liveTrade:invite',async info=>{mode='trade';show('🤝 Trade invitation');panel.append(el('p',info.from+' wants to trade with you.'));panel.append(button('Accept',async()=>{try{await emit('liveTrade:respond',true)}catch(e){status(e.message)}}),button('Decline',()=>s.emit('liveTrade:respond',false)))});
 s.on('liveTrade:state',data=>{state=data;renderTrade()});
 s.on('liveTrade:end',data=>{state=null;if(mode==='trade'){show('🤝 Trading');status(data.message);if(typeof loadInventory==='function')loadInventory().catch(()=>{})}});
}
document.addEventListener('click',e=>{const action=e.target.closest('[data-game-action]')?.dataset.gameAction;if(action==='profiles')profiles();if(action==='live-trade'){installSocket();trade()}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){if(mode==='trade')sock()?.emit('liveTrade:cancel');panel.hidden=true}});
const watcher=setInterval(()=>{if(sock())installSocket()},1500);
})();
