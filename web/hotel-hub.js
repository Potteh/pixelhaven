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
activate('chat');
console.info('[Pixel Haven] Unified hotel panel ready');
})();