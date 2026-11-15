/* Pixel Haven Hotel View & Room-O-Matic — original hotel directory. */
(()=>{
'use strict';
const overlay=document.getElementById('hotelView'),content=document.getElementById('hotelViewContent');
const open=document.getElementById('navigatorOpen'),close=document.getElementById('hotelViewClose');
const tabs=[...document.querySelectorAll('[data-room-tab]')];
let rooms=[],tab='popular',query='',busy=false,previousFocus=null;
const make=(tag,className,text)=>{const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e};
const apiRooms=async(path,method='GET',body)=>{
 const token=localStorage.getItem('pixel_token');
 const response=await fetch('/api'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
 const result=await response.json();if(!response.ok)throw Error(result.error||'Request failed');return result;
};
const username=()=>document.getElementById('identity')?.textContent?.split(' · ')[0]||'';
async function refresh(){try{rooms=await apiRooms('/rooms');render()}catch(e){content.replaceChildren(make('p','roomomaticError',e.message))}}
function show(name='popular'){
 if(!localStorage.getItem('pixel_token'))return;
 previousFocus=document.activeElement;overlay.hidden=false;document.body.classList.add('hotelViewActive');
 setTab(name);close.focus();refresh();
}
function hide(){overlay.hidden=true;document.body.classList.remove('hotelViewActive');previousFocus?.focus?.()}
function setTab(name){tab=name;tabs.forEach(t=>{const active=t.dataset.roomTab===name;t.classList.toggle('active',active);t.setAttribute('aria-selected',String(active))});render()}
function render(){
 content.replaceChildren();
 if(tab==='create'){renderCreator();return}
 const bar=make('div','hotelRoomSearch');
 const heading=make('div','hotelRoomHeading',tab==='mine'?'🔑 Your rooms':'🌟 Discover the hotel');
 const search=make('input');search.type='search';search.placeholder='Search room names or owners';search.value=query;search.setAttribute('aria-label','Search rooms');
 search.addEventListener('input',()=>{query=search.value;drawCards()});
 bar.append(heading,search);content.append(bar);
 const list=make('div','hotelRoomCards');content.append(list);
 function drawCards(){
  list.replaceChildren();
  const own=rooms.filter(r=>Number(r.owner_id)===Number(window.pixelHotelUserId));
  const candidates=tab==='mine'?own:rooms;
  const visible=candidates.filter(r=>(r.name+' '+(r.description||'')+' '+(r.owner||'')).toLowerCase().includes(query.toLowerCase()));
  if(!visible.length){list.append(make('p','hotelEmpty',tab==='mine'?'No rooms yet. Use Room-O-Matic to create one.':'No rooms match your search.'));return}
  for(const r of visible){
   const card=make('article','hotelRoomCard');
   const art=make('div','hotelRoomThumbnail');art.textContent=Number(r.id)===1?'🏨':'🛋️';
   const details=make('div','hotelRoomDetails');
   const title=make('strong',null,r.name);const description=make('p',null,r.description||'Come in and explore!');
   const meta=make('small',null,(r.owner?'By '+r.owner:'Official Hotel Room')+' · '+(r.is_public?'🌐 Open':'🔒 Locked'));
   details.append(title,description,meta);
   const locked=!r.is_public&&Number(r.owner_id)!==Number(window.pixelHotelUserId);
   const enter=make('button','hotelEnter',locked?'🔔 Request Entry':'Enter Room');
   enter.onclick=async()=>{if(locked){enter.disabled=true;try{const result=await apiRooms('/rooms/'+r.id+'/request-entry','POST');enter.textContent=result.status==='approved'?'✓ Approved — Enter':'⏳ Request Pending';if(result.status==='approved'){enter.disabled=false;enter.onclick=()=>{hide();window.join?.(r.id)}}}catch(e){enter.textContent=e.message}return}hide();window.join?.(r.id)};
   card.append(art,details,enter);if(Number(r.owner_id)===Number(window.pixelHotelUserId)&&!r.is_public){const requests=make('button','hotelEnter','🔔 Entry Requests');requests.onclick=()=>window.pixelRoomRequests?.(r.id);card.append(requests)}list.append(card);
  }
 }
 drawCards();
}
const roomDesignFields=(form,values={})=>{
 const controls={};
 const row=(label,input)=>{const wrapper=make('label','roomomaticDesignField');wrapper.append(document.createTextNode(label),input);form.append(wrapper);return input};
 for(const [key,label,fallback] of [['wall_color','Wall color','#827b8f'],['floor_color','Floor color','#b3b8c8']]){
  const input=make('input');input.type='color';input.value=values[key]||fallback;controls[key]=row(label,input);
 }
 for(const [key,label,choices,defaultValue] of [
  ['floor_pattern','Flooring',['checker','solid','wood','tiles'],'checker'],
  ['layout','Room style',['classic','lounge','studio'],'classic']]){
  const select=make('select');for(const option of choices){const o=make('option',null,option[0].toUpperCase()+option.slice(1));o.value=option;select.append(o)}select.value=values[key]||defaultValue;controls[key]=row(label,select);
 }
 return ()=>Object.fromEntries(Object.entries(controls).map(([k,v])=>[k,v.value]));
};
window.pixelRoomRequests=async roomId=>{
 const backdrop=make('div','roomSettingsBackdrop'),panel=make('div','roomSettingsPanel');
 panel.append(make('h3',null,'🔔 Locked Room Entry Requests'));
 const list=make('div','roomRequestList'),close=make('button',null,'Close');close.type='button';close.onclick=()=>backdrop.remove();
 panel.append(list,close);backdrop.append(panel);document.body.append(backdrop);
 async function refresh(){
  list.replaceChildren();
  try{
   const requests=await apiRooms('/rooms/'+roomId+'/requests');
   if(!requests.length){list.append(make('p',null,'No pending entry requests'));return}
   for(const request of requests){
    const row=make('div','roomRequestRow');row.append(make('strong',null,request.username));
    for(const [label,decision] of [['✓ Approve','approved'],['✕ Deny','denied']]){
     const b=make('button',null,label);b.type='button';
     b.onclick=async()=>{b.disabled=true;try{await apiRooms('/rooms/'+roomId+'/requests/'+request.id,'POST',{decision});await refresh()}catch(e){b.disabled=false;row.append(make('small',null,e.message))}};
     row.append(b)
    }
    list.append(row)
   }
  }catch(e){list.append(make('p',null,e.message))}
 }
 await refresh();
};
window.pixelRoomSettings=(room,onSaved)=>{
 const backdrop=make('div','roomSettingsBackdrop'),panel=make('form','roomSettingsPanel');
 const title=make('h3',null,'🎨 Room-O-Matic 2.0 — Room Settings');
 const name=make('input');name.value=room.name;name.maxLength=64;name.required=true;
 const description=make('textarea');description.value=room.description||'';description.maxLength=240;
 const privacy=make('input');privacy.type='checkbox';privacy.checked=room.is_public;
 const label=(text,input)=>{const l=make('label','roomomaticDesignField',text);l.append(input);panel.append(l)};
 panel.append(title);label('Room name',name);label('Description',description);
 const visibility=make('label','roomomaticPrivacy');visibility.append(privacy,document.createTextNode(' Open room — anyone can enter (uncheck to lock)'));panel.append(visibility);
 const readStyle=roomDesignFields(panel,room);
 const status=make('p','roomomaticStatus');panel.append(status);
 const actions=make('div','roomSettingsActions'),cancel=make('button',null,'Cancel'),save=make('button',null,'Save Room');
 cancel.type='button';save.type='submit';actions.append(cancel,save);panel.append(actions);backdrop.append(panel);document.body.append(backdrop);
 const close=()=>backdrop.remove();cancel.onclick=close;
 backdrop.addEventListener('click',e=>{if(e.target===backdrop)close()});
 panel.onsubmit=async e=>{e.preventDefault();save.disabled=true;status.textContent='Saving…';try{
  const updated=await apiRooms('/rooms/'+room.id,'PATCH',{name:name.value,description:description.value,is_public:privacy.checked,...readStyle()});
  onSaved?.(updated);close();
 }catch(err){status.textContent=err.message}finally{save.disabled=false}};
 name.focus();
};
function renderCreator(){
 const form=make('form','roomomaticForm');
 const title=make('h3',null,'🛠️ Room-O-Matic');
 const intro=make('p',null,'Design your own room in the hotel. Choose a name and who can enter.');
 const nameLabel=make('label',null,'Room name');const name=make('input');name.required=true;name.minLength=3;name.maxLength=64;name.placeholder='e.g. Winter Rooftop Lounge';nameLabel.append(name);
 const descriptionLabel=make('label',null,'Description');const description=make('textarea');description.maxLength=240;description.rows=3;description.placeholder='Tell guests what makes your room special';descriptionLabel.append(description);
 const privacy=make('label','roomomaticPrivacy');const publicInput=make('input');publicInput.type='checkbox';publicInput.checked=true;privacy.append(publicInput,document.createTextNode(' Open room — visible in Explore Rooms (uncheck to lock)'));
 const styleSection=make('fieldset','roomomaticDesign');styleSection.append(make('legend',null,'Room appearance'));const readStyle=roomDesignFields(styleSection);const preview=make('div','roomomaticPreview');preview.append(make('span',null,'🛋️'),make('strong',null,'Your new room'),make('small',null,'10 × 10 isometric floor · decorate with your furniture'));
 const status=make('p','roomomaticStatus');
 const submit=make('button','roomomaticCreate','✨ Create Room');submit.type='submit';
 form.append(title,intro,preview,nameLabel,descriptionLabel,privacy,styleSection,status,submit);
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;busy=true;submit.disabled=true;status.textContent='Creating room…';
  try{
   const room=await apiRooms('/rooms','POST',{name:name.value.trim(),description:description.value.trim(),is_public:publicInput.checked,...readStyle()});
   await refresh();setTab('mine');status.textContent='';
   // The existing app handles socket joins and the room's furniture state.
   await window.loadRooms?.();window.join?.(room.id);
   hide();
  }catch(err){status.textContent=err.message}
  finally{busy=false;submit.disabled=false}
 });
 content.append(form);
}
open?.addEventListener('click',()=>show());
close?.addEventListener('click',hide);
tabs.forEach(t=>t.addEventListener('click',()=>setTab(t.dataset.roomTab)));
document.addEventListener('keydown',e=>{if(overlay.hidden)return;if(e.key==='Escape'){e.preventDefault();hide()}else if(e.key==='Tab'){const focusable=[...overlay.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled)')].filter(el=>el.getClientRects().length);if(!focusable.length)return;const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
window.pixelHotelView={show,refresh};
})();
