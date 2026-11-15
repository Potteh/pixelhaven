/* Pixel Haven v4.2 — original pixel-furniture atlas.
   Generated locally from pixel primitives; no external image assets or dependencies. */
(() => {
'use strict';
const atlas=new Map(), S=2;
function sprite(kind) {
 if(atlas.has(kind))return atlas.get(kind);
 const c=document.createElement('canvas');c.width=104;c.height=112;
 const g=c.getContext('2d');g.imageSmoothingEnabled=false;
 g.translate(52,91);
 const rect=(x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),w,h)};
 const poly=(pts,color,edge='#292b40')=>{g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fillStyle=color;g.fill();if(edge){g.lineWidth=2;g.strokeStyle=edge;g.stroke()}};
 const iso=(x,y,w,d,h,top,left,right)=>{
   poly([[x,y-h-d],[x+w,y-h],[x,y-h+d],[x-w,y-h]],top);
   poly([[x-w,y-h],[x,y-h+d],[x,y+d],[x-w,y]],left);
   poly([[x,y-h+d],[x+w,y-h],[x+w,y],[x,y+d]],right);
 };
 const sparkle=(x,y)=>{rect(x,y,2,6,'#fff3c5');rect(x-2,y+2,6,2,'#fff3c5')};
 const leaf=(x,y,color)=>{poly([[x,y-8],[x+8,y-4],[x+11,y+3],[x+3,y+5],[x-2,y+1]],color,'#245b43');rect(x+2,y-2,4,2,'#a5df87')};
 const stem=(x1,y1,x2,y2,color='#37684c')=>{g.strokeStyle=color;g.lineWidth=4;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke()};
 // Shared grounding shadow
 g.fillStyle='#12192b66';g.beginPath();g.ellipse(0,2,35,10,0,0,Math.PI*2);g.fill();
 switch(kind){
 case 'sofa':
   iso(0,-3,34,17,15,'#dc8b7f','#743e55','#a85265');
   iso(0,-18,34,8,27,'#c96272','#7b3c57','#a74b64');
   iso(-27,-8,8,11,21,'#eaa18a','#985062','#b9636a');
   iso(27,-8,8,11,21,'#eaa18a','#985062','#b9636a');
   for(const x of [-15,13]){iso(x,-12,14,9,5,'#efad9a','#ad596e','#d17883');rect(x-4,-36,7,2,'#f9c2a7')}
   for(const x of [-26,26]){rect(x,-3,5,6,'#624355');rect(x+1,0,3,3,'#d7b26b')}
   rect(-23,-52,12,2,'#e9a4a1');rect(10,-52,12,2,'#e9a4a1');
   break;
 case 'chair':
   iso(0,-3,19,13,15,'#dbad83','#83506a','#b36e74');
   iso(0,-18,19,7,30,'#b96c80','#713c5c','#97516d');
   iso(-17,-9,6,8,17,'#e6a485','#985f6a','#c37b79');
   iso(17,-9,6,8,17,'#e6a485','#985f6a','#c37b79');
   rect(-13,-45,7,2,'#e9a0a3');rect(-12,-5,4,8,'#49364a');rect(9,-5,4,8,'#49364a');
   break;
 case 'table':
   for(const x of [-21,18]){rect(x,-14,6,20,'#745344');rect(x+2,-12,2,15,'#b78c66')}
   iso(0,-22,31,17,8,'#f3d5a0','#886049','#b98c63');
   poly([[-22,-43],[0,-55],[23,-43],[0,-31]],'#f9e6bd','#dfba7e');
   rect(-13,-41,8,2,'#ffffff88');rect(9,-40,5,2,'#ffffff88');
   break;
 case 'bed':
   iso(0,-2,37,23,16,'#b4d6df','#6a7f9e','#8ca8c1');
   iso(0,-15,37,23,7,'#f3e5d6','#9b8ba2','#c5b2ba');
   iso(-12,-27,17,10,6,'#ffffff','#b5beca','#e5ebef');
   iso(13,-21,17,11,4,'#8fc3d8','#517fa5','#6fa4c3');
   rect(-30,-4,6,8,'#7b5264');rect(25,-4,6,8,'#7b5264');
   break;
 case 'plant':
   iso(0,-3,16,12,23,'#e8b47b','#93604d','#c38b5d');
   rect(-11,-21,4,8,'#fff1b455');rect(5,-14,5,3,'#694e42');
   for(const [x,y] of [[-26,-44],[-15,-57],[0,-64],[17,-58],[26,-44],[-18,-34],[18,-34]]){
     stem(0,-25,x,y);leaf(x,y,x%2?'#4fa36e':'#78c783');
   }
   break;
 case 'lamp':
   iso(0,-2,13,9,9,'#e5c58c','#8d6958','#b18a64');
   rect(-2,-60,5,53,'#a77d57');rect(-1,-57,2,48,'#f2d59a');
   poly([[-19,-66],[19,-66],[13,-43],[-13,-43]],'#ffe4a1','#a47751');
   rect(-13,-62,25,3,'#fff4d1');rect(-10,-47,20,3,'#d5a15f');
   sparkle(10,-73);break;
 case 'arcade':
   iso(0,-5,21,15,58,'#7169d5','#38345d','#5752a3');
   poly([[-16,-56],[16,-56],[16,-33],[-16,-33]],'#1b2946','#26223e');
   poly([[-12,-52],[12,-52],[12,-37],[-12,-37]],'#3d8fb0','#171e3d');
   rect(-8,-48,7,5,'#72f3de');rect(3,-46,5,7,'#ffcf6e');
   poly([[-15,-30],[15,-30],[11,-22],[-11,-22]],'#efb46f','#4c3c6b');
   rect(-6,-28,4,3,'#e34f77');rect(5,-27,3,3,'#65e4e1');
   rect(-12,-66,24,4,'#e8b76b');rect(-8,-12,4,3,'#171b34');rect(5,-12,4,3,'#171b34');
   break;
 default:iso(0,-4,22,14,22,'#d9bb8c','#8a654e','#b48b61');
 }
 atlas.set(kind,c);return c;
}
const previous=window.drawFurniture;
window.drawFurniture=function(f){
 if(!f||!f.kind)return previous(f);
 const p=tile(f.x,f.y),art=sprite(f.kind);
 ctx.save();ctx.imageSmoothingEnabled=false;
 ctx.drawImage(art,Math.round(p.x-52),Math.round(p.y-91));
 ctx.restore();
};
console.info('[Pixel Haven] v4.2 pixel furniture atlas loaded');
})();
