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
 case 'club_sofa':
  a+=path('M22 89 L25 110 L34 110 L35 89 M95 89 L99 110 L108 110 L106 88','#49362d');
  a+=path('M17 49 Q19 29 39 28 L90 28 Q110 31 111 51 L110 91 Q65 110 18 91 Z','#60453a','#cba45c',3);
  a+=path('M26 48 Q28 39 41 38 L87 38 Q100 40 102 50 L101 77 Q64 90 26 77 Z','#886a50');
  a+=path('M25 77 Q64 66 104 77 L103 94 Q64 106 24 94 Z','#b48a58');
  a+=line('M64 45 L64 76','#d5b779',3)+line('M29 85 Q64 96 99 85','#ffe2a1',2);
  for(const x of [25,103])a+=ellipse(x,75,7,13,'#d7ad63');break;
 case 'royal_throne':
  a+=path('M39 83 L37 112 L48 112 L51 89 M79 83 L81 112 L92 112 L89 86','#775026');
  a+=path('M35 21 L43 27 L50 14 L64 25 L78 14 L85 27 L94 21 L92 84 L35 84 Z','#d7a43d','#7d4b24',3);
  a+=path('M44 34 Q64 25 84 34 L83 78 Q64 88 45 78 Z','#8d264c','#f5cf6c',3);
  a+=path('M33 78 Q64 70 96 78 L93 96 Q64 106 36 96 Z','#ae315c','#e3b85b',3);
  a+=ellipse(64,46,7,9,'#efcf6b')+ellipse(64,46,3,5,'#d95870');
  for(const x of [37,64,91])a+=ellipse(x,23,4,4,'#fff0a7');break;
 case 'ice_cream_machine':
  a+=path('M31 32 L97 32 L103 106 L25 106 Z','#e3b6c4','#73566e',3);
  a+=path('M30 30 Q64 9 98 30 L97 43 L30 43 Z','#f8d5e5');
  a+=path('M37 47 L91 47 L89 83 L39 83 Z','#b2e5ee','#7297ac',2);
  for(const [x,c] of [[48,'#ffdbb2'],[64,'#f5a3ba'],[80,'#b4e2c5']]){
   a+=path('M'+(x-6)+' 59 Q'+(x-9)+' 50 '+x+' 48 Q'+(x+9)+' 50 '+(x+6)+' 59 Z',c);
   a+=path('M'+(x-5)+' 60 L'+x+' 74 L'+(x+5)+' 60 Z','#c9975e');
  }
  a+=path('M42 88 H86 V100 H42 Z','#bd719a')+line('M46 94 H82','#ffe2f3',2);break;
 case 'smoke_machine':
  a+=path('M30 73 L96 73 L103 105 L25 105 Z','#4e5368','#292b3d',3);
  a+=path('M36 77 H90 V91 H36 Z','#858ea2');
  a+=ellipse(64,86,13,6,'#293647');
  a+=path('M40 71 Q23 55 44 45 Q60 37 49 26 Q45 18 57 13','none','#c4d8e9',5);
  a+=path('M70 71 Q91 54 74 43 Q60 32 79 18','none','#9ed6e3',6);
  a+=ellipse(40,101,5,4,'#77e7db')+ellipse(89,101,5,4,'#d37aff');break;
 case 'christmas_tree':
  a+=path('M59 89 H69 V111 H59 Z','#765139');
  for(const [y,w] of [[31,17],[49,26],[69,35],[88,43]])a+=path('M64 '+(y-24)+' L'+(64-w)+' '+y+' Q64 '+(y+7)+' '+(64+w)+' '+y+' Z',y%2?'#26795e':'#236d55','#155541',1.5);
  a+=path('M64 3 L69 13 L80 14 L72 22 L74 33 L64 27 L54 33 L56 22 L48 14 L59 13 Z','#ffe19a','#b88c2b',1.5);
  for(const [x,y,c] of [[55,34,'#ffcd62'],[72,43,'#d65366'],[44,64,'#88d8ff'],[81,67,'#ffe17b'],[57,83,'#f46d83'],[75,89,'#fff2bc']])a+=ellipse(x,y,4,4,c);
  a+=line('M49 51 Q65 60 82 49 M37 74 Q63 87 92 73','#f3d18b',2);break;
 case 'christmas_sofa':
  a+=path('M22 87 L27 110 L35 110 L36 90 M96 89 L99 110 L107 110 L105 87','#6d4537');
  a+=path('M19 51 Q21 31 41 31 H87 Q108 32 109 51 L108 91 Q64 106 20 91 Z','#a83246','#ffe0aa',3);
  a+=path('M28 48 Q64 38 100 48 L99 77 Q64 87 29 77 Z','#c74654');
  a+=path('M25 77 Q64 69 103 77 L101 94 Q64 105 26 94 Z','#317c60');
  a+=line('M64 49 V77','#e6b69a',2);
  a+=ellipse(44,68,8,7,'#f7e7d0')+ellipse(83,68,8,7,'#f7e7d0');break;
 case 'christmas_fireplace':
  a+=path('M22 34 H106 V109 H22 Z','#a65346','#713b37',3);
  for(let y=43;y<106;y+=15)a+=line('M26 '+y+' H102','#e5a27c',1.8);
  a+=path('M39 62 H89 V108 H39 Z','#392d38','#f0ca91',3);
  a+=path('M53 101 Q39 87 58 74 Q57 88 67 70 Q91 88 77 103 Z','#f6a54a');
  a+=path('M61 101 Q55 91 67 82 Q77 95 70 102 Z','#ffe3a2','none');
  a+=path('M15 29 H113 V41 H15 Z','#f1d5a3','#9e6e53',2);
  a+=line('M28 23 Q64 40 101 23','#2f986b',5);
  for(const x of [38,67,92])a+=ellipse(x,27,4,5,'#dc4453');break;
 case 'snowman':
  a+=ellipse(64,87,27,26,'#e7f3fa')+ellipse(64,52,20,20,'#f6fcff');
  a+=path('M42 38 H86 V44 H42 Z M49 17 H79 V39 H49 Z','#39475c');
  a+=path('M48 68 Q64 77 80 68 L83 77 Q64 87 45 77 Z','#d34557');
  a+=ellipse(57,49,2.8,3,'#2e3547')+ellipse(72,49,2.8,3,'#2e3547');
  a+=path('M64 55 L83 59 L64 61 Z','#f5a044');
  for(const y of [79,91,103])a+=ellipse(64,y,3,3,'#47566b');break;
 case 'gift_stack':
  a+=path('M19 77 L60 77 L60 109 L19 109 Z','#c44456')+path('M60 77 L88 65 L88 96 L60 109 Z','#a52e4a');
  a+=path('M19 77 L47 64 L88 65 L60 77 Z','#e26775');
  a+=path('M36 70 L47 66 L47 108 L36 108 Z','#ffe0a4');
  a+=path('M61 47 H108 V85 H61 Z','#3b8d79')+path('M61 47 L84 35 L118 47 L108 55 Z','#62baa1');
  a+=path('M80 39 H90 V85 H80 Z','#f5d59b')+line('M61 64 H108','#f5d59b',5);break;
 case 'candy_cane_lamp':
  a+=ellipse(65,108,24,7,'#6a9a84');
  a+=path('M61 105 V35 Q61 16 79 16 Q96 16 96 34 Q96 48 82 48','none','#fff5dc',13);
  for(const [x,y] of [[61,91],[61,69],[61,47],[67,25],[87,22],[92,43]])a+=line('M'+(x-6)+' '+(y-6)+' L'+(x+6)+' '+(y+6),'#d94854',5);
  a+=ellipse(82,48,7,6,'#fff1da');break;
 case 'festive_rug':
  a+=path('M10 83 L64 52 L119 83 L64 115 Z','#d53f4e','#f2dba3',3);
  a+=path('M25 83 L64 61 L103 83 L64 106 Z','#26765a','#fff0c3',2);
  a+=path('M64 69 L69 80 L82 81 L72 90 L75 102 L64 95 L53 102 L56 90 L46 81 L59 80 Z','#f4dc9d','none');break;
 default:
  a+=path('M25 65 L64 42 L104 65 L64 89 Z','url(#wood)')+path('M25 65 L64 89 L64 107 L25 83 Z','#936748')+path('M64 89 L104 65 L104 83 L64 107 Z','#b6845b');
 }
 return start+gradient+a+end;
}

/* Four authored facing states. Side and rear silhouettes are redrawn rather
   than skewing the front sprite; direction 3 mirrors the authored side view. */
function directionalArt(kind,rotation){
 if(rotation===0||!['chair','sofa','bed','table'].includes(kind))return art(kind);
 let a=shadow;
 const rear=rotation===2;
 if(kind==='chair'){
  if(rear){
   a+=path('M44 83 L41 110 L48 110 L52 86 M77 83 L80 110 L87 110 L84 84','#765345');
   a+=path('M36 38 Q39 23 64 22 Q90 23 93 38 L91 87 Q64 101 37 87 Z','#b96b80');
   a+=path('M43 41 Q45 31 64 30 Q82 30 86 41 L84 81 Q64 92 45 81 Z','#ce8290');
   a+=line('M46 43 Q64 36 83 43','#f6b8a9',2);
   a+=path('M32 78 Q64 88 96 78 L91 96 Q64 106 37 96 Z','#9e566d');
   a+=line('M42 89 Q64 97 86 89','#e9a2a1',2);
  }else{
   a+=path('M43 84 L40 110 L47 110 L53 86 M79 81 L83 109 L90 109 L86 80','#6e5044');
   a+=path('M36 32 Q43 23 55 30 L68 37 Q76 43 77 58 L75 86 Q65 95 53 90 L38 82 Q31 70 34 49 Z','#bc7185');
   a+=path('M42 38 Q49 31 56 37 L66 43 Q71 48 71 57 L68 80 L42 70 Z','#e7a2a0');
   a+=line('M43 41 Q53 38 64 47','#ffe0ce',2);
   a+=path('M44 73 Q60 69 85 79 Q91 84 86 92 L71 100 Q53 99 38 88 Z','#d78c90');
   a+=path('M36 69 Q29 67 28 78 L30 89 Q34 94 44 91 L49 79 Z','#b3677e');
   a+=path('M80 76 Q89 75 92 83 L91 94 Q85 99 76 94 L72 83 Z','#ac5b74');
   a+=line('M47 81 Q66 79 81 86','#f7c0b1',2);
  }
 }else if(kind==='sofa'){
  if(rear){
   a+=path('M22 90 L25 111 L33 111 L34 91 M96 91 L97 111 L105 111 L107 90','#674a49');
   a+=path('M18 47 Q20 31 37 30 L91 30 Q108 32 111 48 L110 93 Q64 108 18 93 Z','#b66a7c');
   a+=path('M25 48 Q28 38 40 38 L89 38 Q101 39 103 49 L103 84 Q64 97 25 84 Z','#ce8290');
   a+=line('M30 47 Q64 39 99 47','#f4b8a9',2);
   a+=path('M16 78 Q64 97 113 78 L110 96 Q64 114 18 96 Z','#985169');
   a+=line('M25 91 Q64 104 103 91','#e9a6a0',2);
  }else{
   a+=path('M32 88 L29 111 L37 111 L42 91 M95 87 L100 111 L107 111 L103 88','#674b4c');
   a+=path('M27 38 Q33 28 45 33 L91 52 Q103 58 105 72 L100 92 Q89 100 79 95 L33 76 Q23 68 27 38 Z','#b86c81');
   a+=path('M33 42 Q38 35 46 39 L87 57 Q96 61 97 74 L92 83 L35 62 Z','#e59b9b');
   a+=line('M37 43 L88 64','#ffddc8',2);
   a+=path('M31 69 Q47 66 68 76 L98 87 Q103 94 94 99 Q81 106 63 98 L27 83 Z','#d5878d');
   a+=line('M43 78 L86 94','#ffd1bd',2);
   a+=path('M25 60 Q16 57 15 72 L19 88 Q26 95 39 89 L41 73 Z','#bc6f81');
   a+=path('M99 77 Q111 74 115 87 L113 99 Q108 106 95 102 L89 88 Z','#a75a73');
  }
 }else if(kind==='bed'){
  if(rear){
   a+=path('M19 42 L19 109 L27 109 L27 75 M105 41 L105 109 L113 109 L113 76','#795b50');
   a+=path('M17 41 Q64 17 111 41 L111 67 Q64 91 17 67 Z','#b88e78');
   a+=path('M20 56 L64 32 L108 56 L64 80 Z','#f2e9dd');
   a+=path('M18 65 L64 91 L111 65 L111 81 L64 108 L18 81 Z','#78b2c7');
   a+=line('M21 73 L64 99 L109 73','#d7f3f6',2);
  }else{
   a+=path('M29 47 L25 106 L34 106 L38 68 M95 63 L96 109 L104 109 L103 67','#795d50');
   a+=path('M25 52 L72 27 L109 48 L63 76 Z','#f1e8dc');
   a+=path('M25 52 L63 76 L63 99 L25 75 Z','#7894a7');
   a+=path('M63 76 L109 48 L109 72 L63 99 Z','#6389a1');
   a+=path('M31 55 L73 33 L102 49 L62 70 Z','#fff7e9');
   a+=path('M61 38 Q70 30 81 37 L91 44 Q85 54 74 55 L62 49 Z','#ffffff');
   a+=path('M29 65 L64 84 L106 60 L106 76 L64 101 L29 81 Z','#79b5c9');
   a+=line('M34 73 L64 91 L102 68','#d5f3f5',2);
  }
 }else if(kind==='table'){
  // Side/rear tables use the same top material but distinct leg occlusion.
  a+=path(rear?'M27 76 L25 109 L33 109 L37 78 M89 76 L95 109 L103 109 L97 77':'M40 73 L36 110 L44 110 L50 79 M93 69 L98 107 L106 107 L102 71','#765440');
  a+=path(rear?'M16 62 L64 34 L112 62 L64 90 Z':'M23 52 L75 33 L113 66 L61 89 Z','url(#wood)');
  a+=path(rear?'M16 62 L64 90 L64 98 L16 70 Z':'M23 52 L61 89 L61 97 L23 61 Z','#a06f50');
  a+=path(rear?'M64 90 L112 62 L112 70 L64 98 Z':'M61 89 L113 66 L113 74 L61 97 Z','#b7845c');
  a+=line(rear?'M23 62 L64 39 L104 62':'M31 53 L74 39 L105 66','#fff0d0',2);
 }
 if(rotation===3&&!rear)a='<g transform="translate(128 0) scale(-1 1)">'+a+'</g>';
 return start+gradient+a+end;
}
function get(kind,rotation=0){
 const key=kind+':'+rotation;
 if(cache.has(key))return cache.get(key);
 const im=new Image();
 im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(directionalArt(kind,rotation));
 cache.set(key,im);
 return im;
}
const previous=window.drawFurniture;
window.drawFurniture=function(f){
 if(!f?.kind)return previous?.(f);
 const rotation=((Number(f.rotation)||0)%4+4)%4;
 const p=tile(f.x,f.y),im=get(f.kind,rotation);
 if(!im.complete||!im.naturalWidth)return;
 ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 // Each directional image is drawn upright with its own silhouette.
 ctx.translate(Math.round(p.x),Math.round(p.y));
 ctx.drawImage(im,-64,-112,128,128);
 ctx.restore();
};
console.info('[Pixel Haven] v5.8 directional furniture atlas loaded');
})();
