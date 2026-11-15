/* Pixel Haven v4.4 — Grand Lobby visual redesign. Original canvas art. */
(()=>{
'use strict';
const oldRoom=window.drawRoom, oldDecor=window.lobbyDecor;
const isLobby=()=>room&&Number(room.id)===1;
const polygon=(points,fill,stroke='#312738',width=2)=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}};
const line=(x,y,X,Y,color,width=2)=>{ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(X,Y);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke()};
const rect=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h)};
const objects=[
 {x:0,y:8,kind:'plant'},{x:8,y:0,kind:'plant'},
 {x:1,y:1,kind:'reception'},{x:2,y:6,kind:'sofa'},
 {x:6,y:2,kind:'sofa'},{x:3,y:7,kind:'table'},
 {x:7,y:3,kind:'table'},{x:1,y:5,kind:'lamp'},
 {x:5,y:1,kind:'lamp'},{x:7,y:7,kind:'fountain'}
];
window.pixelLobbyObjects=objects;
window.drawRoom=function(){
 if(!isLobby())return oldRoom();
 const bg=ctx.createLinearGradient(0,0,0,660);
 bg.addColorStop(0,'#20192f');bg.addColorStop(.65,'#342942');bg.addColorStop(1,'#151929');
 ctx.fillStyle=bg;ctx.fillRect(0,0,1000,660);
 // Twin burgundy walls, with alternating velvet wallpaper panels.
 polygon([[500,18],[887,232],[887,337],[500,121]],'#5d314a','#2d2339',4);
 polygon([[500,18],[113,232],[113,337],[500,121]],'#73394e','#2d2339',4);
 for(let i=0;i<9;i++){
  const a=i/9,b=(i+1)/9;
  const wall=(sign,shade)=>{
   polygon([[500+sign*387*a,18+214*a],[500+sign*387*b,18+214*b],[500+sign*387*b,121+216*b],[500+sign*387*a,121+216*a]],i%2?shade:'#ffffff08',null);
   line(500+sign*387*a,23+214*a,500+sign*387*a,119+216*a,'#d6a86755',2);
  };
  wall(1,'#21142a22');wall(-1,'#21142a22');
 }
 // Crown molding and gold dado rails.
 for(const sign of [-1,1]){
  line(500,23,500+sign*382,234,'#f4d18c',6);
  line(500,33,500+sign*382,244,'#a16d54',3);
  line(500,104,500+sign*383,316,'#d4a96e',4);
  line(500,116,500+sign*383,328,'#37283c',5);
 }
 // Framed hotel portraits in perspective.
 polygon([[640,119],[714,160],[714,221],[640,180]],'#c69b56','#3a293a',5);
 polygon([[648,133],[705,164],[705,207],[648,176]],'#253f57','#f5d9a1',3);
 polygon([[289,158],[355,121],[355,179],[289,216]],'#c69b56','#3a293a',5);
 polygon([[297,164],[347,136],[347,172],[297,199]],'#375c6a','#f5d9a1',3);
 for(let i=0;i<7;i++){line(655+i*6,162+i*3,655+i*6,171+i*3,'#d5b87955',2)}
 // Thick polished marble floor slab.
 polygon([[70,334],[500,574],[930,334],[930,351],[500,593],[70,351]],'#aa8b83','#322e42',4);
 polygon([[70,334],[500,94],[930,334],[500,574]],'#e2d7c8','#7f6971',3);
 // Isometric marble tiles with gold grout and subtle veining.
 for(let x=0;x<10;x++)for(let y=0;y<10;y++){
  const p=tile(x,y),warm=(x+y)%2===0;
  polygon([[p.x,p.y-24],[p.x+43,p.y],[p.x,p.y+24],[p.x-43,p.y]],warm?'#e8dfd2':'#c9bdb8','#b39b7e',1);
  if((x*7+y*3)%4===0){
   line(p.x-17,p.y-6,p.x+4,p.y+3,'#ffffff66',1);
   line(p.x+4,p.y+3,p.x+17,p.y+2,'#9f969433',1);
  }
 }
 // Woven burgundy carpet, with narrow gold inset.
 for(let x=3;x<=6;x++)for(let y=3;y<=6;y++){
  const p=tile(x,y);
  polygon([[p.x,p.y-23],[p.x+41,p.y],[p.x,p.y+23],[p.x-41,p.y]],(x+y)%2?'#873a55':'#9c4760','#c6985e',1);
  polygon([[p.x,p.y-18],[p.x+34,p.y],[p.x,p.y+18],[p.x-34,p.y]],'#8d3b56',null);
 }
 // Marble columns with capital, foot and vertical fluting.
 for(const X of [129,871]){
  rect(X-11,239,22,78,'#dbc5ac');rect(X-8,245,4,67,'#f9e6ca');rect(X+5,245,3,67,'#ac8c86');
  polygon([[X-20,237],[X+20,237],[X+16,246],[X-16,246]],'#eacb94','#80614e');
  polygon([[X-21,316],[X+21,316],[X+25,328],[X-25,328]],'#d8b88a','#76565a');
  rect(X-18,234,36,4,'#f7d8a2');
 }
 // Soft ambient golden vignette from sconces.
 for(const [X,Y] of [[265,173],[738,170],[500,105]]){
  const glow=ctx.createRadialGradient(X,Y,1,X,Y,100);
  glow.addColorStop(0,'#ffdf9d28');glow.addColorStop(1,'#ffdf9d00');
  ctx.fillStyle=glow;ctx.fillRect(X-100,Y-100,200,200);
 }
};
window.lobbyDecor=function(){
 if(!isLobby())return oldDecor();
 // Wall plaque, gold typography and decorative diamonds.
 polygon([[399,44],[601,44],[612,74],[601,94],[399,94],[388,74]],'#3e2b40','#dbac66',4);
 ctx.save();ctx.textAlign='center';ctx.shadowColor='#e7aa55';ctx.shadowBlur=7;
 ctx.fillStyle='#ffe1a2';ctx.font='bold 24px Georgia,serif';ctx.fillText('PIXEL HAVEN',500,70);
 ctx.shadowBlur=0;ctx.fillStyle='#d9b37c';ctx.font='bold 11px Georgia,serif';ctx.fillText('THE GRAND LOBBY',500,85);
 ctx.restore();
 for(const x of [405,595])polygon([[x,66],[x+6,72],[x,78],[x-6,72]],'#efc57e',null);
};
window.drawPixelLobbyObject=function(o){
 const p=tile(o.x,o.y),X=p.x,Y=p.y;
 if(['table','plant','lamp'].includes(o.kind)){drawFurniture(o);return;}
 if(o.kind==='sofa'){
  ctx.save();
  ctx.fillStyle='#16162766';ctx.beginPath();ctx.ellipse(X,Y+4,46,13,0,0,Math.PI*2);ctx.fill();
  isoBox(X,Y,38,18,12,'#d8948b','#71384e','#a85569');
  isoBox(X,Y-17,38,8,23,'#c36c7d','#76384f','#a64e67');
  for(const dx of [-19,18]){
   isoBox(X+dx,Y-7,17,10,5,'#edb0a0','#9f4d65','#c97982');
   line(X+dx-6,Y-14,X+dx+4,Y-9,'#ffd4ba',2);
  }
  isoBox(X-35,Y-4,8,10,17,'#df9789','#8b4356','#b76570');
  isoBox(X+35,Y-4,8,10,17,'#df9789','#8b4356','#b76570');
  rect(X-27,Y+5,6,5,'#6b4052');rect(X+23,Y+5,6,5,'#6b4052');
  ctx.restore();return;
 }
 if(o.kind==='reception'){
  // Paneled walnut reception desk, marble countertop and brass kick plate.
  isoBox(X,Y,37,20,32,'#f0d9ad','#765047','#a66e54');
  isoBox(X,Y-27,39,21,7,'#e8d5ba','#927c72','#c8ad8b');
  for(const offset of [-20,2,24]){
   polygon([[X+offset-7,Y-10],[X+offset+7,Y-3],[X+offset+7,Y+12],[X+offset-7,Y+5]],'#7b4450','#e2b76f',2);
  }
  line(X-34,Y+10,X,Y+28,'#e7ba6d',3);line(X,Y+28,X+34,Y+10,'#e7ba6d',3);
  ctx.save();ctx.textAlign='center';ctx.font='bold 11px Georgia,serif';ctx.fillStyle='#fff0c4';
  ctx.fillText('RECEPTION',X,Y-34);ctx.restore();
  return;
 }
 if(o.kind==='fountain'){
  // Tiered aqua fountain with basin, stone rim and animated water jets.
  const t=Date.now()/700;
  ctx.save();
  ctx.fillStyle='#111e2d77';ctx.beginPath();ctx.ellipse(X,Y+8,57,20,0,0,Math.PI*2);ctx.fill();
  isoBox(X,Y,44,27,21,'#e6d6b9','#8a899a','#b5a9a7');
  ctx.fillStyle='#62bcd1';ctx.beginPath();ctx.ellipse(X,Y-22,35,13,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#d5f9ff';ctx.lineWidth=2;
  for(let i=-2;i<=2;i++){
   const x=X+i*9;ctx.beginPath();ctx.moveTo(x,Y-25);ctx.quadraticCurveTo(x+i*4,Y-72-7*Math.sin(t+i),X+i*5,Y-37);ctx.stroke();
  }
  isoBox(X,Y-24,13,9,26,'#e7d9bf','#8a92a1','#c1b7b3');
  ctx.fillStyle='#b8f8ff';ctx.beginPath();ctx.ellipse(X,Y-57,15,5,0,0,Math.PI*2);ctx.fill();
  ctx.restore();
 }
};
console.info('[Pixel Haven] v4.4 Grand Lobby polish active');
})();
