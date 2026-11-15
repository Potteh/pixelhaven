/* Pixel Haven v5.4 — original layered vector character atlas.
 * SVG artwork is rasterized at native resolution; no enlarged 40px blocks.
 * Retains server movement, emotes, seated poses and avatar options.
 */
(()=>{
'use strict';
const cache=new Map(),motion=new Map();
const valid=(v,d)=>/^#[0-9a-f]{6}$/i.test(v||'')?v:d;
const shade=(hex,n)=>{const a=parseInt(hex.slice(1),16);return '#'+[16,8,0].map(k=>Math.max(0,Math.min(255,((a>>k)&255)+n)).toString(16).padStart(2,'0')).join('')};
const dirs=['front','front-right','right','back-right','back','back-left','left','front-left'];
function svgArt(a,dir,frame){
 const skin=valid(a.skin,'#e8ad7d'),shirt=valid(a.shirt,'#4b86e8'),hair=valid(a.hair,'#493323');
 const style=a.hairstyle||'short',outfit=a.outfit||'tee',face=a.face||'smile',accessory=a.accessory||'none';
 const back=dir.startsWith('back'),side=dir==='right'||dir==='left',diag=dir.includes('-');
 const phase=frame===1?1:frame===3?-1:0,bob=frame===2?1:0;
 const ink='#34313b',light=shade(skin,22),dark=shade(skin,-23),fabric=shade(shirt,-28),pants=valid(a.pantsColor,'#425674'),shoe=valid(a.shoeColor,'#1c2535'),bottom=a.pants||'jeans',footwear=a.shoes||'sneakers';
 const p=[];
 const path=(d,fill,stroke=ink,w=1.35)=>p.push('<path d="'+d+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+w+'" stroke-linejoin="round" stroke-linecap="round"/>');
 const ell=(cx,cy,rx,ry,fill)=>p.push('<ellipse cx="'+cx+'" cy="'+cy+'" rx="'+rx+'" ry="'+ry+'" fill="'+fill+'"/>');
 const line=(d,color,w=1)=>path(d,'none',color,w);
 // Bottoms and footwear are separate wardrobe layers, animated per stride.
 for(const [x,step] of [[29,phase*4],[46,-phase*4]]){
   path('M'+(x+step)+' 73 L'+(x+step+12)+' 73 L'+(x+step+12)+' '+(bottom==='shorts'?84:96)+' Q'+(x+step+10)+' 100 '+(x+step+3)+' 99 L'+(x+step-1)+' 96 Z',bottom==='shorts'?skin:pants);if(bottom==='shorts')path('M'+(x+step)+' 73 h12 v12 h-12 Z',pants);
   line('M'+(x+step+3)+' 76 L'+(x+step+3)+' 91',shade(pants,25),1.6);
   path('M'+(x+step-2)+' 95 Q'+(x+step+4)+' 92 '+(x+step+12)+' 95 L'+(x+step+15)+' 102 Q'+(x+step+12)+' 105 '+(x+step-4)+' 104 Z',shoe);
   if(footwear==='sneakers')line('M'+(x+step-2)+' 101 L'+(x+step+13)+' 101','#f5ede3',2);else if(footwear==='boots')path('M'+(x+step-2)+' 88 h14 v13 h-14 Z',shade(shoe,-15));else line('M'+(x+step)+' 100 h12',shade(shoe,38),1.5);
 }
 if(bottom==='skirt')path('M25 73 L59 73 L66 89 Q43 97 19 89 Z',pants);
 // Jacket / hoodie / tee silhouette, sleeve layers and rounded shoulders.
 path('M27 48 Q32 43 40 44 L51 44 Q58 45 61 51 L63 76 Q48 81 23 76 L22 55 Q22 50 27 48 Z',shirt);
 path('M23 53 Q18 53 17 62 L16 77 Q20 82 25 78 L30 60 Z',fabric);
 path('M59 53 Q65 52 67 61 L68 77 Q63 82 59 78 L55 61 Z',shade(shirt,-18));
 path('M17 76 Q21 79 25 76 L25 83 Q21 86 17 82 Z',skin);
 path('M59 76 Q64 79 68 76 L68 83 Q64 86 59 82 Z',skin);
 line('M27 74 Q42 77 60 74',shade(shirt,-43),2);
 if(outfit==='sweater'){path('M28 50 Q42 57 57 50 L59 74 Q43 79 26 74 Z',shirt);for(let k=0;k<4;k++)line('M'+(29+k*8)+' 69 v6',shade(shirt,-45),1.3)}else if(outfit==='vest'){path('M29 48 L38 46 L42 72 L25 74 Z',fabric);path('M47 46 L58 48 L61 74 L45 72 Z',fabric);line('M43 49 v24','#eee2d4',2)}else if(outfit==='dress'){path('M27 51 Q43 46 59 51 L68 88 Q44 96 18 88 Z',shirt);line('M22 84 Q44 90 64 84',shade(shirt,35),2)}else if(outfit==='hoodie'){
   path('M29 46 Q40 39 53 46 L49 53 L33 53 Z',fabric);
   path('M32 69 Q42 66 53 69 L52 76 L33 76 Z',shade(shirt,-12));
   line('M39 52 L39 64 M46 52 L46 63','#f2d5b5',1.5);
 }else if(outfit==='jacket'){
   path('M27 48 L36 47 L41 75 L24 76 Z',fabric);
   path('M49 47 L59 48 L61 76 L44 75 Z',fabric);
   line('M42 49 L42 76','#e7d6bd',2);
   line('M29 62 L35 62 M51 62 L57 62','#b8a9a1',1.4);
 }else{path('M35 46 Q42 53 49 46 L47 51 Q42 55 37 51 Z',shade(shirt,-48),'none');}
 // Neck, ear shadows, rounded face and cheek/jaw contours.
 path('M36 41 L49 41 L48 50 Q42 53 37 49 Z',dark);
 const hx=side?32:diag?29:26,hw=side?28:diag?32:36;
 path('M'+(hx+5)+' 14 Q'+(hx+hw/2)+' 8 '+(hx+hw-4)+' 15 Q'+(hx+hw+2)+' 23 '+(hx+hw-1)+' 36 Q'+(hx+hw-3)+' 45 '+(hx+hw/2)+' 47 Q'+(hx+3)+' 44 '+hx+' 35 Q'+(hx-2)+' 22 '+(hx+5)+' 14 Z',skin);
 path('M'+(hx+2)+' 29 Q'+(hx+4)+' 42 '+(hx+hw/2)+' 44 Q'+(hx+hw-4)+' 42 '+(hx+hw-2)+' 34', 'none',dark,1.5);
 if(!back){
   ell(hx+1,31,3.5,5,skin);ell(hx+hw-1,31,3.5,5,dark);
   if(side){
     ell(hx+19,29,2.3,3.2,ink);ell(hx+19.6,28,0.7,1,'#fff');
     line('M'+(hx+24)+' 37 q-3 3 -6 1','#a45d60',1.8);
   }else{
     const eye1=hx+(diag?15:12),eye2=hx+(diag?26:26);
     ell(eye1,29,2.2,3,ink);
     if(face==='wink')line('M'+(eye2-2)+' 29 l4 0',ink,2);
     else ell(eye2,29,2.2,3,ink);
     ell(eye1+.6,28.2,.7,.9,'#fff');if(face!=='wink')ell(eye2+.6,28.2,.7,.9,'#fff');
     line('M'+(hx+20)+' 31 q2 2 0 4',dark,1.2);
     if(face==='neutral')line('M'+(hx+15)+' 39 l12 0','#a45d60',1.6);
     else if(face==='happy')path('M'+(hx+14)+' 38 Q'+(hx+20)+' 47 '+(hx+27)+' 38 Q'+(hx+20)+' 43 '+(hx+14)+' 38 Z','#a85b65','none');
     else line('M'+(hx+15)+' 38 Q'+(hx+21)+' 44 '+(hx+27)+' 38','#a45d60',1.8);
   }
   ell(hx+9,36,4,2,'#e89c9566');
 }else{
   path('M'+(hx+4)+' 20 Q'+(hx+hw/2)+' 9 '+(hx+hw-4)+' 20 L'+(hx+hw-3)+' 41 Q'+(hx+hw/2)+' 48 '+(hx+3)+' 40 Z',hair,'none');
 }
 // Layered hair silhouettes with subtle curved highlights.
 const hairBase='M'+(hx-1)+' 27 Q'+(hx-2)+' 8 '+(hx+12)+' 8 Q'+(hx+hw/2)+' 1 '+(hx+hw-8)+' 9 Q'+(hx+hw+3)+' 13 '+(hx+hw+1)+' 27 L'+(hx+hw-4)+' 22 Q'+(hx+hw/2)+' 16 '+(hx+7)+' 19 L'+(hx+2)+' 29 Z';
 path(hairBase,hair);
 line('M'+(hx+8)+' 14 Q'+(hx+hw/2)+' 7 '+(hx+hw-9)+' 14',shade(hair,27),2);
 if(style==='spiky')for(let i=0;i<4;i++)path('M'+(hx+4+i*8)+' 13 l3 -'+(8+i%2*4)+' l7 9 Z',hair,'none');
 if(style==='long'){path('M'+hx+' 19 Q'+(hx-5)+' 30 '+(hx-2)+' 52 L'+(hx+6)+' 51 L'+(hx+7)+' 23 Z',hair);path('M'+(hx+hw-6)+' 21 Q'+(hx+hw+6)+' 35 '+(hx+hw+3)+' 52 L'+(hx+hw-5)+' 52 Z',shade(hair,-8))}
 if(style==='sidepart'){path('M'+(hx+2)+' 18 Q'+(hx+13)+' 4 '+(hx+hw)+' 17 L'+(hx+hw-6)+' 22 Q'+(hx+17)+' 13 '+(hx+2)+' 25 Z',hair);line('M'+(hx+10)+' 13 Q'+(hx+17)+' 10 '+(hx+23)+' 12',shade(hair,36),2)}
 if(style==='buzz')path('M'+(hx+2)+' 19 Q'+(hx+hw/2)+' 9 '+(hx+hw-2)+' 19',shade(hair,-10),'none');
 if((accessory==='glasses'||accessory==='sunglasses')&&!back){
   path('M'+(hx+7)+' 26 h12 v9 h-12 Z M'+(hx+22)+' 26 h12 v9 h-12 Z','none',ink,2.2);
   if(accessory==='sunglasses'){path('M'+(hx+8)+' 27 h10 v7 h-10 Z M'+(hx+23)+' 27 h10 v7 h-10 Z','#26364a','none')}line('M'+(hx+19)+' 28 h3',ink,2);line('M'+(hx+8)+' 27 l8 0','#d3f5ff',1);
 }
 if(accessory==='beanie'){path('M'+(hx-2)+' 21 Q'+(hx+hw/2)+' -5 '+(hx+hw+2)+' 21 L'+(hx+hw+2)+' 27 L'+(hx-2)+' 27 Z',shade(shirt,-35));line('M'+hx+' 23 H'+(hx+hw),shade(shirt,30),3)}if(accessory==='cap'){
   path('M'+(hx-2)+' 19 Q'+(hx+hw/2)+' -1 '+(hx+hw+3)+' 19 L'+(hx+hw)+' 23 L'+hx+' 23 Z',shade(shirt,-36));
   path('M'+(hx+hw-6)+' 21 Q'+(hx+hw+5)+' 19 '+(hx+hw+14)+' 24 L'+(hx+hw+8)+' 27 L'+(hx+hw-5)+' 25 Z',shade(shirt,-50));
 }
 if(accessory==='headphones'){
   path('M'+(hx-5)+' 28 Q'+(hx-8)+' 1 '+(hx+hw/2)+' 2 Q'+(hx+hw+8)+' 2 '+(hx+hw+5)+' 28','none','#263b55',4);
   path('M'+(hx-7)+' 25 h7 v15 h-7 Z M'+(hx+hw)+' 25 h7 v15 h-7 Z','#405e76');
 }
 return '<svg xmlns="http://www.w3.org/2000/svg" width="84" height="110" viewBox="0 0 84 110"><g transform="'+(dir==='left'||dir.endsWith('-left')?'translate(84 0) scale(-1 1)':'')+' translate(0 '+bob+')">'+p.join('')+'</g></svg>';
}
function sprite(a,dir,frame){
 const key=JSON.stringify([a,dir,frame]);
 if(cache.has(key))return cache.get(key);
 const im=new Image();
 const svg=svgArt(a,dir,frame);
 im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
 cache.set(key,im);
 if(cache.size>600)cache.clear();
 return im;
}
function facing(dx,dy,old){
 if(Math.hypot(dx,dy)<.01)return old;
 const angle=Math.atan2((dx+dy)*24/43,dx-dy);
 const sectors=['right','front-right','front','front-left','left','back-left','back','back-right'];
 return sectors[((Math.round(angle/(Math.PI/4))%8)+8)%8];
}
const old=window.drawAvatar;
window.drawAvatar=function(p){
 if(!p?.user)return old?.(p);
 const id=p.socketId||p.user.id||p.user.username;
 let m=motion.get(id);if(!m){m={x:p.x,y:p.y,dir:'front',last:performance.now(),stride:0};motion.set(id,m)}
 const now=performance.now(),dt=Math.min((now-m.last)/1000,.06);m.last=now;
 const dx=p.x-m.x,dy=p.y-m.y,dist=Math.hypot(dx,dy);
 if(dist>.001){m.dir=facing(dx,dy,m.dir);const step=Math.min(dist,dt*4.3);m.x+=dx/dist*step;m.y+=dy/dist*step;m.stride+=step*2.8}
 const seated=p.pose?.type==='sit',frame=!seated&&dist>.045?1+Math.floor(m.stride)%3:0;
 const pos=tile(m.x,m.y),x=pos.x,y=pos.y;
 ctx.save();ctx.fillStyle='#10182a55';ctx.beginPath();ctx.ellipse(x,y+3,16,5,0,0,Math.PI*2);ctx.fill();
 const im=sprite(p.user.avatar||{},m.dir,frame);
 const emote=p.emote?.until>Date.now()?p.emote.name:null;
 const bounce=emote==='cheer'?Math.abs(Math.sin(now/110))*7:emote==='dance'?Math.abs(Math.sin(now/145))*5:0;
 const sway=emote==='dance'?Math.sin(now/170)*.12:emote==='laugh'?Math.sin(now/95)*.04:0;
 ctx.translate(x,y-bounce);ctx.rotate(sway);
 if(im.complete&&im.naturalWidth){
   if(seated)ctx.drawImage(im,0,0,84,79,-42,-99,84,79);
   else ctx.drawImage(im,-42,-112,84,110);
 }
 if(seated){ctx.fillStyle='#425674';ctx.fillRect(-18,-20,36,10);ctx.fillStyle='#252c3d';ctx.fillRect(-20,-11,16,7);ctx.fillRect(4,-11,16,7)}
 if(emote==='wave'||emote==='cheer'){
   ctx.save();ctx.rotate(emote==='wave'?Math.sin(now/125)*.08:0);
   ctx.fillStyle=valid(p.user.avatar?.shirt,'#4b86e8');ctx.fillRect(24,-92,9,27);
   ctx.fillStyle=valid(p.user.avatar?.skin,'#e8ad7d');ctx.beginPath();ctx.ellipse(28,-96,6,7,0,0,Math.PI*2);ctx.fill();ctx.restore();
 }
 ctx.restore();
 const name=String(p.user.username||'Guest').slice(0,24);
 ctx.font='bold 12px system-ui';ctx.textAlign='center';
 const mod=p.user.role==='moderator';const prefix=mod?'MOD-':'';const width=Math.min(180,ctx.measureText(prefix+name).width+18);
 ctx.fillStyle='#10192de8';ctx.fillRect(x-width/2,y-125,width,21);
 if(mod){ctx.fillStyle='#ffd27e';ctx.textAlign='left';const full=ctx.measureText(prefix+name).width;ctx.font='900 12px system-ui';ctx.fillText(prefix,x-full/2,y-110);ctx.font='bold 12px system-ui';ctx.fillStyle='#fff';ctx.fillText(name,x-full/2+ctx.measureText(prefix).width,y-110)}else{ctx.fillStyle='#fff';ctx.fillText(name,x,y-110)}
};
window.pixelAvatarPreview=(g,a,dir='front')=>{
 const im=sprite(a||{},dir,0);
 g.clearRect(0,0,120,152);
 if(im.complete&&im.naturalWidth)g.drawImage(im,4,0,112,147);
 else im.addEventListener('load',()=>{g.clearRect(0,0,120,152);g.drawImage(im,4,0,112,147)},{once:true});
};
window.pixelAvatarPosition=id=>{const m=motion.get(id);return m?tile(m.x,m.y):null};
setInterval(()=>{if(typeof players==='undefined')return;for(const id of motion.keys())if(!players.has(id))motion.delete(id)},10000);
console.info('[Pixel Haven] v5.9 expanded wardrobe atlas active');
})();
