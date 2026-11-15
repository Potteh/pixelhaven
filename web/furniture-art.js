/* Pixel Haven v5.5: original illustrated furniture atlas.
   Scalable SVG artwork, cached per furniture kind; existing placement stays unchanged. */
(()=>{
'use strict';
const cache=new Map();
const start='<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">';
const end='</svg>';
const shadow='<ellipse cx="64" cy="110" rx="45" ry="12" fill="#172033" opacity=".24"/>';
const path=(d,fill,stroke='#353044',w=2)=>'<path d="'+d+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+w+'" stroke-linejoin="round" stroke-linecap="round"/>';
const line=(d,color='#ffffff',w=2)=>path(d,'none',color,w);
const ellipse=(x,y,rx,ry,fill)=>'<ellipse cx="'+x+'" cy="'+y+'" rx="'+rx+'" ry="'+ry+'" fill="'+fill+'"/>';
const gradient='<defs><linearGradient id="fabric" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f7c2a8"/><stop offset=".55" stop-color="#d47e88"/><stop offset="1" stop-color="#9b4f70"/></linearGradient><linearGradient id="wood" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#f6d6a6"/><stop offset=".5" stop-color="#c79565"/><stop offset="1" stop-color="#80573f"/></linearGradient><linearGradient id="metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#d9e0e5"/><stop offset=".6" stop-color="#8195a6"/><stop offset="1" stop-color="#4c6379"/></linearGradient></defs>';
function art(kind){
 let a=shadow;
 switch(kind){
 case 'sofa':
  a+=path('M23 90 L30 100 L30 111 L24 111 L20 99 Z','#684d4c')+path('M98 89 L105 98 L104 111 L98 111 L94 101 Z','#684d4c');
  a+=path('M18 54 Q19 33 36 34 L91 34 Q109 35 110 56 L108 88 Q105 97 93 99 L35 99 Q20 98 17 86 Z','url(#fabric)');
  a+=path('M25 53 Q28 41 40 42 L61 43 Q67 48 65 69 L60 80 L27 78 Z','#e9a1a0');
  a+=path('M66 45 Q73 39 91 43 Q102 46 101 59 L100 80 L66 81 Z','#c76c82');
  a+=line('M63 46 Q65 59 64 78','#97526a',2)+line('M30 48 Q43 43 55 49','#ffe4d2',2);
  a+=path('M27 73 Q46 67 64 75 Q84 67 101 75 L103 92 Q79 100 63 95 Q43 99 25 92 Z','#d9858a');
  a+=line('M64 75 L64 94','#9d5b72',2)+line('M31 78 Q47 74 59 79','#ffd2b9',2)+line('M69 79 Q85 74 96 79','#f6b6b0',2);
  a+=path('M17 64 Q8 62 9 77 L11 91 Q14 99 27 99 L32 92 L31 71 Q27 63 17 64 Z','#bd7181');
  a+=path('M106 64 Q117 64 118 77 L116 91 Q113 99 100 99 L95 92 L96 71 Q100 63 106 64 Z','#a85c76');
  a+=line('M14 74 Q18 70 25 74 M101 74 Q108 70 113 74','#f9c2b0',2);break;
 case 'chair':
  a+=path('M39 92 L43 110 L49 110 L48 92 M79 92 L80 110 L86 110 L88 92','#765345');
  a+=path('M38 42 Q41 25 64 25 Q86 25 90 42 L88 76 Q83 87 64 86 Q45 86 39 76 Z','url(#fabric)');
  a+=path('M44 44 Q47 33 64 32 Q80 33 84 44 L82 73 Q64 83 46 72 Z','#dc9293');
  a+=line('M49 45 Q64 39 79 46','#ffe0c6',2);
  a+=path('M34 75 Q35 67 46 65 L81 65 Q94 67 95 77 L90 92 Q65 103 39 91 Z','#d1858b');
  a+=path('M29 65 Q19 63 20 76 L23 91 Q28 95 38 91 L41 74 Q38 66 29 65 Z','#b96b7c');
  a+=path('M99 65 Q108 64 108 76 L105 91 Q99 95 89 91 L86 74 Q90 66 99 65 Z','#ad6078');
  a+=line('M43 79 Q64 73 86 79','#f5b8ab',2);break;
 case 'table':
  a+=path('M34 78 L31 110 L39 110 L46 79 Z','#78563f')+path('M83 79 L89 110 L97 110 L91 75 Z','#78563f');
  a+=path('M16 62 L64 35 L113 61 L65 91 Z','url(#wood)');
  a+=path('M16 62 L65 91 L65 99 L16 70 Z','#9c6b4b')+path('M65 91 L113 61 L113 69 L65 99 Z','#b88357');
  a+=line('M25 61 L65 39 L104 61','#fff0d0',2)+line('M32 68 L63 51 M55 81 L90 60','#8c624a',1);
  a+=ellipse(63,59,13,5,'#e9e1cf')+ellipse(63,58,8,3,'#fff9ea');break;
 case 'bed':
  a+=path('M14 62 L14 105 L24 105 L24 81 M106 59 L106 106 L115 106 L115 69','#86614e');
  a+=path('M12 42 Q13 30 26 30 L47 40 L47 85 L13 69 Z','#b68a71');
  a+=path('M13 59 L65 31 L116 59 L65 91 Z','#d8d2c7');
  a+=path('M13 59 L65 91 L65 107 L13 75 Z','#738da4')+path('M65 91 L116 59 L116 77 L65 107 Z','#56718b');
  a+=path('M20 57 L65 34 L109 58 L65 83 Z','#f5e9dc');
  a+=path('M47 44 Q56 36 68 42 L84 51 Q83 60 67 64 L49 55 Z','#ffffff');
  a+=line('M50 47 Q65 44 78 53','#c8d4d9',2);
  a+=path('M18 69 L65 93 L113 65 L113 77 L65 105 L18 81 Z','#7ab3c9');
  a+=line('M20 75 L65 98 L111 71','#d4f3f6',2)+line('M44 86 L64 96','#4d849e',1.5);break;
 case 'plant':
  a+=path('M44 82 L84 82 L77 109 Q64 116 51 109 Z','#c47d58');
  a+=ellipse(64,82,21,7,'#edb188')+ellipse(64,81,16,4,'#705844');
  for(const [x,y,ex,ey] of [[42,47,25,29],[51,36,43,18],[67,32,69,12],[81,39,96,20],[87,54,111,43],[43,64,20,59],[75,63,96,57]]){
    a+=line('M64 81 Q'+x+' '+(y+8)+' '+ex+' '+ey,'#3d7657',3);
    a+=path('M'+x+' '+y+' Q'+(ex-12)+' '+(ey-15)+' '+ex+' '+ey+' Q'+(ex+9)+' '+(ey+14)+' '+x+' '+y+' Z','#5cab72','#326a50',1.4);
    a+=line('M'+x+' '+y+' L'+ex+' '+ey,'#a1db8e',1);
  }break;
 case 'lamp':
  a+=ellipse(64,105,23,7,'url(#metal)');
  a+=path('M61 50 L67 50 L69 103 L59 103 Z','url(#metal)');
  a+=path('M36 29 Q64 18 92 29 L84 60 Q65 68 44 60 Z','#f6d69d','#a77d59');
  a+=path('M43 33 Q64 26 85 33 L80 55 Q64 60 48 55 Z','#ffe7b2','none');
  a+=line('M44 57 Q64 62 84 57','#b78b61',2);
  a+=ellipse(64,28,28,7,'#f8e6c4');a+=ellipse(64,28,23,4,'#fff0cd');break;
 case 'arcade':
  a+=path('M42 15 L86 15 L96 43 L93 109 L35 109 L32 43 Z','#5955a2');
  a+=path('M43 19 L85 19 L90 43 L38 43 Z','#a39de5');
  a+=path('M39 40 L89 40 L86 74 L42 74 Z','#242d53');
  a+=path('M45 45 L83 45 L80 68 L48 68 Z','#3588a5');
  a+=ellipse(61,55,10,8,'#69f4d9')+ellipse(72,57,5,7,'#f9c96d');
  a+=path('M42 76 L86 76 L94 90 L35 90 Z','#e5a66c');
  a+=ellipse(56,82,4,4,'#ec6484')+ellipse(73,84,4,4,'#67e5d4');
  a+=path('M35 90 L94 90 L91 108 L38 108 Z','#454078');
  a+=line('M44 97 L84 97','#8378c5',2);break;
 default:
  a+=path('M25 65 L64 42 L104 65 L64 89 Z','url(#wood)')+path('M25 65 L64 89 L64 107 L25 83 Z','#936748')+path('M64 89 L104 65 L104 83 L64 107 Z','#b6845b');
 }
 return start+gradient+a+end;
}
function get(kind){
 if(cache.has(kind))return cache.get(kind);
 const im=new Image();
 im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(art(kind));
 cache.set(kind,im);
 return im;
}
const previous=window.drawFurniture;
window.drawFurniture=function(f){
 if(!f?.kind)return previous?.(f);
 const p=tile(f.x,f.y),im=get(f.kind);
 if(!im.complete||!im.naturalWidth)return;
 ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 ctx.drawImage(im,Math.round(p.x-64),Math.round(p.y-112),128,128);
 ctx.restore();
};
console.info('[Pixel Haven] v5.5 illustrated furniture atlas loaded');
})();
