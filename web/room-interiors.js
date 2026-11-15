/* Pixel Haven v5.2 — original furnished-room architecture and materials. */
(()=>{
'use strict';
const previous=window.drawRoom;
const poly=(pts,color,stroke)=>{ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=color;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}};
const stroke=(a,b,c,d,color,w=2)=>{ctx.strokeStyle=color;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(a,b);ctx.lineTo(c,d);ctx.stroke()};
window.drawRoom=function(){
 if(!room||Number(room.id)===1)return previous();
 const bg=ctx.createLinearGradient(0,0,0,660);bg.addColorStop(0,'#25354a');bg.addColorStop(1,'#101c2b');ctx.fillStyle=bg;ctx.fillRect(0,0,1000,660);
 // Solid room walls, upper trim, wainscoting and depth-aware shading.
 poly([[500,14],[899,232],[899,344],[500,122]],'#677e8b','#293b50');
 poly([[500,14],[101,232],[101,344],[500,122]],'#87979c','#293b50');
 for(let i=1;i<10;i++){
  const t=i/10;
  stroke(500,14,500+(399*t),14+(218*t),'#d2d5c066',1);
  stroke(500-399*t,232-218*t,500-399*t,344-222*t,'#e5e5d52a',2);
  stroke(500+399*t,14+218*t,500+399*t,122+222*t,'#152d3a22',2);
 }
 for(const sign of [-1,1]){
  stroke(500,23,500+sign*395,239,'#f4e4c0',5);
  stroke(500,113,500+sign*395,330,'#d4c4a7',6);
  stroke(500,124,500+sign*395,342,'#354b55',4);
 }
 // Tall framed window with sky, skyline and warm interior trim.
 poly([[620,105],[742,171],[742,257],[620,190]],'#c6ad87','#3b4550');
 poly([[628,116],[733,174],[733,242],[628,185]],'#76a9bf','#f4d7a5');
 poly([[632,121],[729,175],[729,235],[632,182]],'#93c4d0',null);
 for(let i=0;i<6;i++){
  const x=638+i*16,y=176+i*8;
  poly([[x,y],[x+13,y+7],[x+13,y+28],[x,y+21]],i%2?'#577b89':'#648a93',null);
 }
 stroke(680,144,680,214,'#f0d7ae',5);stroke(628,152,733,210,'#f0d7ae',4);
 // Wall artwork on the opposite wall.
 poly([[267,167],[355,118],[355,185],[267,234]],'#cba777','#514857');
 poly([[276,173],[346,133],[346,180],[276,219]],'#345f69','#e5d0ac');
 poly([[285,196],[309,168],[326,174],[339,154],[339,182],[285,213]],'#8fb39a',null);
 // Thick floor slab and beveled hardwood planks.
 poly([[70,334],[500,574],[930,334],[930,353],[500,594],[70,353]],'#79675c','#283644');
 poly([[70,334],[500,94],[930,334],[500,574]],'#a88162','#6c605b');
 for(let x=0;x<10;x++)for(let y=0;y<10;y++){
  const p=tile(x,y),v=(x*17+y*11)%5;
  const woods=['#b98d6b','#b28666','#c19774','#ad8063','#bd906e'];
  poly([[p.x,p.y-24],[p.x+43,p.y],[p.x,p.y+24],[p.x-43,p.y]],woods[v],'#80624f');
  stroke(p.x-27,p.y-8,p.x+14,p.y+13,'#e5c29b44',1);
  stroke(p.x-13,p.y+7,p.x+21,p.y-9,'#6d523b24',1);
 }
 // Central woven rug with woven edging and dimensional border.
 for(let x=3;x<=6;x++)for(let y=3;y<=6;y++){
  const p=tile(x,y);
  poly([[p.x,p.y-22],[p.x+41,p.y],[p.x,p.y+22],[p.x-41,p.y]],(x+y)%2?'#647b85':'#718a93','#d2b78c');
  poly([[p.x,p.y-17],[p.x+33,p.y],[p.x,p.y+17],[p.x-33,p.y]],'#76919a',null);
 }
 // Soft window daylight on the wood floor.
 const glow=ctx.createRadialGradient(690,365,20,690,365,240);
 glow.addColorStop(0,'#f5e3ad20');glow.addColorStop(1,'#f5e3ad00');
 ctx.fillStyle=glow;ctx.fillRect(440,160,500,420);
};
console.info('[Pixel Haven] v5.2 realistic room interiors loaded');
})();
