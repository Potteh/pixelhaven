/* Pixel Haven v4.7 — stacked, collision-aware in-world speech bubbles. */
(()=>{
'use strict';
const GAP=7,MAX_WIDTH=194,MAX_LINES=4,EDGE=8;
function wrap(message){
 ctx.font='13px system-ui';
 const words=String(message||'').replace(/\s+/g,' ').trim().split(' ');
 const lines=[];let line='';
 for(const word of words){
  const candidate=line?line+' '+word:word;
  if(ctx.measureText(candidate).width<=MAX_WIDTH){line=candidate;continue;}
  if(line){lines.push(line);line='';}
  let part='';
  for(const char of word){
   if(ctx.measureText(part+char).width>MAX_WIDTH&&part){lines.push(part);part='';}
   part+=char;
  }
  line=part;
 }
 if(line)lines.push(line);
 const shown=lines.slice(0,MAX_LINES);
 if(lines.length>MAX_LINES&&shown.length){
  let last=shown[shown.length-1];
  while(last&&ctx.measureText(last+'…').width>MAX_WIDTH)last=last.slice(0,-1);
  shown[shown.length-1]=last+'…';
 }
 return shown;
}
function overlaps(a,b,pad=5){return a.x<b.x+b.w+pad&&a.x+a.w+pad>b.x&&a.y<b.y+b.h+pad&&a.y+a.h+pad>b.y;}
function draw(){
 if(!room||!players.size)return;
 const now=Date.now(),occupied=[],jobs=[];
 for(const [id,entry] of chatBubbles){
  const player=players.get(id);
  if(!player){chatBubbles.delete(id);continue;}
  const messages=(entry.messages||[]).filter(m=>m.until>now);
  if(!messages.length){chatBubbles.delete(id);continue;}
  entry.messages=messages;
  const pos=window.pixelAvatarPosition?.(id)||tile(player.x,player.y);
  jobs.push({id,pos,messages});
 }
 // Stable priority ensures nearby speakers don't flicker between positions.
 jobs.sort((a,b)=>a.pos.x-b.pos.x||String(a.id).localeCompare(String(b.id)));
 ctx.save();ctx.font='13px system-ui';ctx.textAlign='center';ctx.textBaseline='alphabetic';
 for(const job of jobs){
  let bottom=job.pos.y-145;
  for(let i=job.messages.length-1;i>=0;i--){
   const msg=job.messages[i],lines=wrap(msg.text);
   if(!lines.length)continue;
   const w=Math.min(224,Math.max(60,...lines.map(t=>ctx.measureText(t).width+24)));
   const h=lines.length*17+16;
   let x=Math.max(EDGE,Math.min(1000-EDGE-w,job.pos.x-w/2));
   let y=bottom-h;
   // Shift bubbles upward to avoid speech from neighboring avatars.
   let attempts=0;
   while(occupied.some(o=>overlaps({x,y,w,h},o))&&attempts++<25)y-=12;
   // Keep the text readable inside the canvas; if space runs out, skip oldest.
   if(y<EDGE)continue;
   const fade=Math.min(1,(msg.until-now)/650);
   ctx.globalAlpha=Math.max(.08,fade);
   ctx.fillStyle='#fffdf5';ctx.strokeStyle='#49364e';ctx.lineWidth=2;
   ctx.beginPath();ctx.roundRect(x,y,w,h,8);ctx.fill();ctx.stroke();
   if(i===job.messages.length-1){
    const tailX=Math.max(x+12,Math.min(x+w-12,job.pos.x));
    ctx.beginPath();ctx.moveTo(tailX-6,y+h);ctx.lineTo(tailX,y+h+8);ctx.lineTo(tailX+6,y+h);ctx.closePath();ctx.fill();ctx.stroke();
   }
   ctx.fillStyle='#25283d';
   lines.forEach((line,j)=>ctx.fillText(line,x+w/2,y+19+j*17));
   ctx.globalAlpha=1;
   occupied.push({x,y,w,h});
   bottom=y-GAP;
  }
 }
 ctx.restore();
}
window.drawRoomChatBubbles=draw;
console.info('[Pixel Haven] v4.7 stacked speech bubbles enabled');
})();