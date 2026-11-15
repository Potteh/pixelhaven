/* Pixel Haven unified hotel panel — no framework or server changes. */
(()=>{
'use strict';
const tabs=[...document.querySelectorAll('.hubTab')];
const panels={chat:document.getElementById('hubChat'),inventory:document.getElementById('hubInventory'),avatar:document.getElementById('hubAvatar')};
function activate(name,focus=false){
 for(const tab of tabs){
  const active=tab.dataset.hub===name;
  tab.classList.toggle('active',active);
  tab.setAttribute('aria-selected',String(active));
  tab.tabIndex=active?0:-1;
  panels[tab.dataset.hub].hidden=!active;
 }
 if(focus)document.querySelector('.hubTab[data-hub="'+name+'"]').focus();
}
for(const tab of tabs){
 tab.addEventListener('click',()=>activate(tab.dataset.hub));
 tab.addEventListener('keydown',e=>{
  const i=tabs.indexOf(tab),next=e.key==='ArrowRight'?(i+1)%tabs.length:e.key==='ArrowLeft'?(i+tabs.length-1)%tabs.length:-1;
  if(next>=0){e.preventDefault();activate(tabs[next].dataset.hub,true);}
 });
}
const hub=document.getElementById('hotelHub'),open=document.getElementById('hubOpen'),close=document.getElementById('hubClose');
let previousFocus=null;
function showHub(name='chat'){
 previousFocus=document.activeElement;
 hub.hidden=false;open.setAttribute('aria-expanded','true');
 activate(name);
 const selected=document.querySelector('.hubTab[data-hub="'+name+'"]');
 selected?.focus();
}
function hideHub(){
 hub.hidden=true;open.setAttribute('aria-expanded','false');
 if(hub.contains(document.activeElement))open.focus();
}
open.addEventListener('click',()=>hub.hidden?showHub():hideHub());
close.addEventListener('click',hideHub);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!hub.hidden){e.preventDefault();hideHub();}});
activate('chat');
console.info('[Pixel Haven] Unified hotel panel ready');
})();