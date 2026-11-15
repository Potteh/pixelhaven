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
  const candidates=tab==='mine'?own:rooms.filter(r=>r.is_public);
  const visible=candidates.filter(r=>(r.name+' '+(r.description||'')+' '+(r.owner||'')).toLowerCase().includes(query.toLowerCase()));
  if(!visible.length){list.append(make('p','hotelEmpty',tab==='mine'?'No rooms yet. Use Room-O-Matic to create one.':'No rooms match your search.'));return}
  for(const r of visible){
   const card=make('article','hotelRoomCard');
   const art=make('div','hotelRoomThumbnail');art.textContent=Number(r.id)===1?'🏨':'🛋️';
   const details=make('div','hotelRoomDetails');
   const title=make('strong',null,r.name);const description=make('p',null,r.description||'Come in and explore!');
   const meta=make('small',null,(r.owner?'By '+r.owner:'Official Hotel Room')+' · '+(r.is_public?'Public':'Private'));
   details.append(title,description,meta);
   const enter=make('button','hotelEnter','Enter Room');
   enter.onclick=()=>{hide();window.join?.(r.id)};
   card.append(art,details,enter);list.append(card);
  }
 }
 drawCards();
}
function renderCreator(){
 const form=make('form','roomomaticForm');
 const title=make('h3',null,'🛠️ Room-O-Matic');
 const intro=make('p',null,'Design your own room in the hotel. Choose a name and who can enter.');
 const nameLabel=make('label',null,'Room name');const name=make('input');name.required=true;name.minLength=3;name.maxLength=64;name.placeholder='e.g. Winter Rooftop Lounge';nameLabel.append(name);
 const descriptionLabel=make('label',null,'Description');const description=make('textarea');description.maxLength=240;description.rows=3;description.placeholder='Tell guests what makes your room special';descriptionLabel.append(description);
 const privacy=make('label','roomomaticPrivacy');const publicInput=make('input');publicInput.type='checkbox';publicInput.checked=true;privacy.append(publicInput,document.createTextNode('Public room — visible in Explore Rooms'));
 const preview=make('div','roomomaticPreview');preview.append(make('span',null,'🛋️'),make('strong',null,'Your new room'),make('small',null,'10 × 10 isometric floor · decorate with your furniture'));
 const status=make('p','roomomaticStatus');
 const submit=make('button','roomomaticCreate','✨ Create Room');submit.type='submit';
 form.append(title,intro,preview,nameLabel,descriptionLabel,privacy,status,submit);
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;busy=true;submit.disabled=true;status.textContent='Creating room…';
  try{
   const room=await apiRooms('/rooms','POST',{name:name.value.trim(),description:description.value.trim(),is_public:publicInput.checked});
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
