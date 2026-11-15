/* Pixel Haven v5.6 — coherent isometric room surfaces, material lighting and occlusion. */
(()=>{
'use strict';
const oldRoom=window.drawRoom;
const polygon=(points,fill,edge=null,w=1)=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(edge){ctx.lineWidth=w;ctx.strokeStyle=edge;ctx.stroke()}};
const segment=(x,y,X,Y,color,w=1)=>{ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(X,Y);ctx.strokeStyle=color;ctx.lineWidth=w;ctx.stroke()};
const floorPoint=(u,v)=>({x:500+(u-v)*43,y:118+(u+v)*24});
const floorPoly=(a,b,c,d,fill,stroke=null,w=1)=>{const pts=[[a,b],[c,b],[c,d],[a,d]].map(([u,v])=>{const p=floorPoint(u,v);return[p.x,p.y]});polygon(pts,fill,stroke,w)};
const presets=[
 {wallA:'#9e9d9b',wallB:'#7c8d92',trim:'#ead7b5',floor:'#b99572',grain:'#694c3a',rug:'#718e92',light:'#ffe4b5'},
 {wallA:'#8d93a6',wallB:'#667b93',trim:'#d8dce5',floor:'#ad917b',grain:'#62534e',rug:'#9b7b92',light:'#d8e9ff'},
 {wallA:'#a79c8c',wallB:'#8a9581',trim:'#e9dfc5',floor:'#c29b71',grain:'#765b3c',rug:'#7f9a7d',light:'#fff1c8'}
];
function drawPrivateRoom(){
 const variant=presets[(Number(room?.id)||2)%presets.length];
 const bg=ctx.createLinearGradient(0,0,0,660);bg.addColorStop(0,'#23364a');bg.addColorStop(1,'#142337');ctx.fillStyle=bg;ctx.fillRect(0,0,1000,660);
 // Architectural surfaces share the same floor origin as the movement grid.
 polygon([[500,18],[930,256],[930,351],[500,113]],variant.wallB,'#3d4854',3);
 polygon([[500,18],[70,256],[70,351],[500,113]],variant.wallA,'#3d4854',3);
 for(const sign of [-1,1]){
  segment(500,25,500+sign*427,260,variant.trim,5);
  segment(500,106,500+sign*427,345,variant.trim,6);
  segment(500,116,500+sign*427,355,'#344954',4);
  for(let n=1;n<9;n++){
   const t=n/9,x=500+sign*430*t,y=18+238*t;
   segment(x,y+15,x,y+84,'#ffffff1c',1);
   segment(x,y+88,x,y+100,'#35475333',2);
  }
 }
 // Framed view on the right wall with mullions and distant buildings.
 polygon([[637,108],[764,179],[764,263],[637,191]],'#d4bd95','#4b5260',4);
 polygon([[645,120],[755,182],[755,249],[645,187]],'#8ebbd0','#f1dfb7',2);
 polygon([[651,127],[748,183],[748,242],[651,185]],'#9dc8d6',null);
 for(let i=0;i<6;i++){
  const x=656+i*16,y=175+i*9,h=16+(i*7)%18;
  polygon([[x,y],[x+13,y+7],[x+13,y+h+7],[x,y+h]],i%2?'#648d99':'#7da4a9',null);
 }
 segment(701,151,701,220,'#f0dbb4',4);
 segment(646,153,754,216,'#f0dbb4',4);
 polygon([[645,187],[755,249],[755,257],[645,195]],'#e4caa4',null);
 // Left-wall framed artwork.
 polygon([[240,165],[348,106],[348,184],[240,243]],'#d7b98a','#4c4c56',3);
 polygon([[250,172],[339,123],[339,178],[250,227]],'#3e737e','#f5dbb2',2);
 polygon([[260,205],[290,170],[312,176],[333,148],[333,179],[260,219]],'#92b49a',null);
 // Floor slab and planks: continuous wood rather than checkerboard cubes.
 polygon([[70,351],[500,590],[930,351],[930,366],[500,607],[70,366]],'#765a4b','#2c3844',3);
 floorPoly(-.5,-.5,9.5,9.5,variant.floor,'#785e4b',2);
 // Long staggered boards aligned to one room axis.
 for(let v=-.5;v<=9.5;v+=.85){
  const a=floorPoint(-.5,v),b=floorPoint(9.5,v);
  segment(a.x,a.y,b.x,b.y,variant.grain+'7a',1.4);
  const highlight=floorPoint(-.5,v+.09),highlightEnd=floorPoint(9.5,v+.09);
  segment(highlight.x,highlight.y,highlightEnd.x,highlightEnd.y,'#fff0d52b',1);
 }
 for(let u=-.5;u<=9.5;u+=2.2){
  for(let j=0;j<12;j++){
   const v=j*.85-.5,offset=(j%3)*.73;
   const p=floorPoint(u+offset,v),q=floorPoint(u+offset,v+.85);
   segment(p.x,p.y,q.x,q.y,'#6d514a66',1);
  }
 }
 // One woven inset rug with border and patterned fabric.
 floorPoly(2.3,2.3,6.7,6.7,'#c9b397','#806f67',2);
 floorPoly(2.45,2.45,6.55,6.55,variant.rug,'#e5d4b7',2);
 floorPoly(2.85,2.85,6.15,6.15,variant.rug,null);
 for(let i=0;i<7;i++){
  const u=3+i*.46;
  const a=floorPoint(u,3),b=floorPoint(u,6);
  segment(a.x,a.y,b.x,b.y,'#f5e4c51f',1);
 }
 // Daylight pools are clipped to the floor so light never bleeds over walls.
 ctx.save();ctx.beginPath();
 [[70,351],[500,590],[930,351],[500,113]].forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
 ctx.closePath();ctx.clip();
 const light=ctx.createRadialGradient(715,318,5,715,318,265);
 light.addColorStop(0,variant.light+'65');light.addColorStop(.55,variant.light+'25');light.addColorStop(1,variant.light+'00');
 ctx.fillStyle=light;ctx.fillRect(400,100,550,490);
 ctx.restore();
}
window.drawRoom=function(){if(!room||Number(room.id)===1)return oldRoom();drawPrivateRoom()};
window.pixelRoomFloorShadow=function(f){
 if(!f||typeof f.x!=='number'||typeof f.y!=='number')return;
 const p=floorPoint(f.x,f.y),wide={sofa:42,bed:44,table:30,chair:24,plant:18,lamp:15,arcade:24,reception:45,fountain:47};
 const rx=wide[f.kind]||25;
 ctx.save();ctx.fillStyle='#19233045';ctx.beginPath();ctx.ellipse(p.x+6,p.y+4,rx,Math.max(6,rx*.28),-.1,0,Math.PI*2);ctx.fill();ctx.restore();
};
console.info('[Pixel Haven] v5.6 room materials and light engine loaded');
})();
