const $=s=>document.querySelector(s),canvas=$('#game'),ctx=canvas.getContext('2d');
let token=localStorage.getItem('pixel_token'),me=null,socket=null,room=null,players=new Map(),furniture=[],selected=null,catalog={},inventory=[],authRegister=false,chatBubbles=new Map();
const colors=['#e8ad7d','#a96b46','#f2cba5','#6d4535','#4b86e8','#ef7d82','#72c49a','#9b7de5','#493323','#1c2535','#f5ca59','#ffffff'];
const emoji={chair:'🪑',sofa:'🛋️',table:'🪵',plant:'🪴',lamp:'💡',bed:'🛏️',arcade:'🕹️'};
function toast(s){$('#toast').textContent=s;$('#toast').style.display='block';setTimeout(()=>$('#toast').style.display='none',3200)}
async function api(url,method='GET',data){const r=await fetch('/api'+url,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:data?JSON.stringify(data):undefined});const j=await r.json();if(!r.ok)throw Error(j.error||'Request failed');return j}
function tile(x,y,z=0){return {x:500+(x-y)*43,y:118+(x+y)*24-z}}
function diamond(x,y,fill,stroke='#ffffff22'){const p=tile(x,y);ctx.beginPath();ctx.moveTo(p.x,p.y-24);ctx.lineTo(p.x+43,p.y);ctx.lineTo(p.x,p.y+24);ctx.lineTo(p.x-43,p.y);ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.stroke()}
// Pixel Haven visual engine v2: original vector-pixel assets, depth-sorted entities.
function poly(points,fill,stroke='#27314b',line=2){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.lineWidth=line;ctx.strokeStyle=stroke;ctx.stroke()}}
function isoBox(px,py,w=22,h=18,z=18,top='#e9c995',left='#96634b',right='#b78359'){
 poly([[px,py-z],[px+w,py-z+h/2],[px,py-z+h],[px-w,py-z+h/2]],top);
 poly([[px-w,py-z+h/2],[px,py-z+h],[px,py+h],[px-w,py+h/2]],left);
 poly([[px,py-z+h],[px+w,py-z+h/2],[px+w,py+h/2],[px,py+h]],right);
}
function ellipse(x,y,rx,ry,color){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill()}
function line(x1,y1,x2,y2,color,width=2){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
function drawAvatar(p){const pt=tile(p.x,p.y),a=p.user.avatar||{},x=pt.x,y=pt.y;
 ellipse(x,y+6,18,7,'#1d274466');
 // shoes and legs
 ctx.fillStyle='#28364e';ctx.fillRect(x-10,y-20,8,17);ctx.fillRect(x+2,y-20,8,17);
 ctx.fillStyle='#161c2c';ctx.fillRect(x-12,y-5,11,6);ctx.fillRect(x+1,y-5,12,6);
 // arms, jacket and shirt
 ctx.fillStyle=a.skin||'#e8ad7d';ctx.fillRect(x-17,y-43,7,23);ctx.fillRect(x+10,y-43,7,23);
 poly([[x-12,y-48],[x+12,y-48],[x+15,y-22],[x-15,y-22]],a.shirt||'#4b86e8','#293248',2);
 ctx.fillStyle='#ffffff55';ctx.fillRect(x-3,y-44,6,18);
 // neck and head
 ctx.fillStyle=a.skin||'#e8ad7d';ctx.fillRect(x-5,y-55,10,10);
 poly([[x-12,y-73],[x+12,y-73],[x+13,y-54],[x+8,y-48],[x-8,y-48],[x-13,y-54]],a.skin||'#e8ad7d','#543b38',2);
 // hairstyle and highlights
 poly([[x-14,y-70],[x-12,y-82],[x-4,y-85],[x+5,y-82],[x+12,y-84],[x+15,y-71],[x+10,y-67],[x+6,y-74],[x-4,y-71],[x-12,y-65]],a.hair||'#493323','#2b2431',2);
 ctx.fillStyle='#ffffff33';ctx.fillRect(x-7,y-79,8,2);
 ctx.fillStyle='#242a38';ctx.fillRect(x-7,y-62,3,3);ctx.fillRect(x+5,y-62,3,3);
 ctx.fillStyle='#a95e5c';ctx.fillRect(x-2,y-54,5,2);
 ctx.textAlign='center';ctx.font='bold 12px system-ui';const label=p.user.username,w=ctx.measureText(label).width+18;
 ctx.fillStyle='#10192de8';ctx.fillRect(x-w/2,y-105,w,20);ctx.fillStyle='#fff';ctx.fillText(label,x,y-91);
 const bubble=chatBubbles.get(p.socketId);if(bubble&&bubble.until>Date.now()){ctx.font='13px system-ui';const text=bubble.text.slice(0,40),bw=Math.min(300,ctx.measureText(text).width+24);ctx.fillStyle='#f9fbff';ctx.fillRect(x-bw/2,y-145,bw,30);ctx.fillStyle='#26334b';ctx.fillText(text,x,y-125)}
}
function drawFurniture(f){const p=tile(f.x,f.y),x=p.x,y=p.y,k=f.kind;
 ellipse(x,y+3,29,10,'#17243a55');
 if(k==='sofa'){isoBox(x,y,32,18,16,'#e99a6e','#82425b','#b45b65');isoBox(x,y-18,32,12,23,'#e96e76','#8d3958','#bc5064');isoBox(x-29,y-7,8,9,23,'#e8a16d','#a35c56','#c7775c');isoBox(x+29,y-7,8,9,23,'#e8a16d','#a35c56','#c7775c')}
 else if(k==='chair'){isoBox(x,y,17,12,14,'#e9b578','#79503d','#ae7251');isoBox(x,y-16,17,7,29,'#a65e55','#6d3b42','#864955')}
 else if(k==='table'){isoBox(x,y-12,26,15,8,'#ffe0a2','#8c5b42','#b98a59');for(const d of [-16,16])line(x+d,y-5,x+d,y+14,'#714b3f',5)}
 else if(k==='bed'){isoBox(x,y,31,23,14,'#f4e7d8','#7c5a5a','#a97c68');isoBox(x,y-9,31,16,7,'#8db9d7','#567caa','#6896bf');isoBox(x-10,y-17,12,7,5,'#ffffff','#bdcbd8','#dce5ee')}
 else if(k==='plant'){isoBox(x,y,14,10,19,'#e9b27a','#94614a','#b67a53');for(let i=0;i<7;i++){let ang=i*Math.PI*2/7;line(x,y-23,x+Math.cos(ang)*20,y-44+Math.sin(ang)*10,'#2b684d',6);ellipse(x+Math.cos(ang)*20,y-44+Math.sin(ang)*10,9,5,i%2?'#4fa66b':'#75c97b')}}
 else if(k==='lamp'){isoBox(x,y,11,9,8,'#d9aa6b','#87634d','#b28b63');line(x,y-9,x,y-47,'#e9c99b',4);poly([[x-14,y-50],[x+14,y-50],[x+9,y-35],[x-9,y-35]],'#ffe6a4','#a67954');ellipse(x,y-39,22,10,'#ffd27d22')}
 else if(k==='arcade'){isoBox(x,y-14,19,12,44,'#7b75d9','#383d82','#5253ac');poly([[x-12,y-60],[x+12,y-60],[x+12,y-38],[x-12,y-38]],'#1b2a4b','#161b39');ctx.fillStyle='#5ae7dc';ctx.fillRect(x-8,y-56,16,12);ctx.fillStyle='#ffd579';ctx.fillRect(x-4,y-32,8,4)}
 else isoBox(x,y,20,14,22);
}
function drawRoom(){
 const floorTop=tile(0,0),left=tile(0,9),right=tile(9,0),front=tile(9,9);
 // background atmosphere
 const bg=ctx.createLinearGradient(0,0,0,660);bg.addColorStop(0,'#263752');bg.addColorStop(1,'#101a2d');ctx.fillStyle=bg;ctx.fillRect(0,0,1000,660);
 // rear walls, original paneled wallpaper
 poly([[500,18],[887,232],[887,337],[500,121]],'#6b6984','#34344f',3);
 poly([[500,18],[113,232],[113,337],[500,121]],'#827b8f','#34344f',3);
 for(let i=0;i<9;i++){let t=i/9;line(500+(887-500)*t,18+(232-18)*t,500+(887-500)*t,121+(337-121)*t,'#ffffff16',2);line(500-(387*t),18+214*t,500-(387*t),121+216*t,'#ffffff16',2)}
 // picture frames on rear walls
 poly([[640,119],[710,158],[710,210],[640,171]],'#cda76e','#4a3852',4);
 poly([[649,133],[700,161],[700,195],[649,167]],'#324e71','#e9cf91',2);
 poly([[289,139],[351,105],[351,154],[289,190]],'#cda76e','#4a3852',4);
 poly([[300,145],[342,122],[342,149],[300,173]],'#4b7485','#e9cf91',2);
 // floor thickness
 poly([[70,334],[500,574],[930,334],[930,350],[500,593],[70,350]],'#536076','#283448',3);
 for(let x=0;x<10;x++)for(let y=0;y<10;y++)diamond(x,y,(x+y)%2?'#b3b8c8':'#d0cdd0','#8796a455');
 // subtle carpet centerpiece
 for(let x=3;x<7;x++)for(let y=3;y<7;y++){const p=tile(x,y);poly([[p.x,p.y-20],[p.x+37,p.y],[p.x,p.y+20],[p.x-37,p.y]],(x+y)%2?'#ad6e70':'#b97977','#e9c68b',1)}
 // decorative columns
 isoBox(129,316,12,7,72,'#e6d6c1','#9a92a1','#b9a9ae');isoBox(870,316,12,7,72,'#e6d6c1','#9a92a1','#b9a9ae');
}

// Pixel Haven Lobby v3: client-side decorative set dressing for the shared public lobby.
// Decorations are visual only: they do not spend coins or alter saved player furniture.
function lobbyDecor(){
 const t=(x,y)=>tile(x,y);
 const box=(x,y,w,h,z,top,left,right)=>{const p=t(x,y);isoBox(p.x,p.y,w,h,z,top,left,right)};
 const plant=(x,y,scale=1)=>{const p=t(x,y),X=p.x,Y=p.y;ellipse(X,Y+2,23*scale,8*scale,'#121e2c55');isoBox(X,Y,12*scale,8*scale,21*scale,'#e2bc84','#83604d','#b28b68');for(let i=0;i<9;i++){const a=i*Math.PI*2/9;line(X,Y-22*scale,X+Math.cos(a)*24*scale,Y-48*scale+Math.sin(a)*13*scale,'#235a48',5*scale);ellipse(X+Math.cos(a)*24*scale,Y-48*scale+Math.sin(a)*13*scale,9*scale,5*scale,i%2?'#4da96d':'#77c97c')}};
 const lamp=(x,y)=>{const p=t(x,y),X=p.x,Y=p.y;ellipse(X,Y,15,5,'#111c2b55');line(X,Y-5,X,Y-63,'#ba8e54',5);poly([[X-18,Y-65],[X+18,Y-65],[X+12,Y-45],[X-12,Y-45]],'#ffe3a1','#9c7045',3);ellipse(X,Y-46,27,11,'#f9c66a22')};
 const sofa=(x,y)=>{const p=t(x,y),X=p.x,Y=p.y;ellipse(X,Y+5,40,11,'#17233755');isoBox(X,Y,35,20,18,'#c98774','#753d51','#a5545b');isoBox(X,Y-19,35,10,29,'#a64e5c','#6a334b','#893f54');isoBox(X-31,Y-6,9,10,27,'#d89b6f','#87465a','#b9655f');isoBox(X+31,Y-6,9,10,27,'#d89b6f','#87465a','#b9655f');ellipse(X-11,Y-22,10,5,'#e4a48a');ellipse(X+12,Y-17,10,5,'#df8b84')};
 const table=(x,y)=>{const p=t(x,y),X=p.x,Y=p.y;isoBox(X,Y-9,24,13,9,'#dce9e8','#7b5e53','#a17e63');line(X-12,Y,X-12,Y+12,'#9c784e',5);line(X+12,Y,X+12,Y+12,'#9c784e',5);ellipse(X,Y-19,8,3,'#8fd7e6')};
 // Back-wall signage and gold trim, rendered into the hotel environment.
 ctx.save();ctx.shadowColor='#ffc65b';ctx.shadowBlur=14;ctx.textAlign='center';ctx.font='bold 30px system-ui';ctx.fillStyle='#f5c56c';ctx.fillText('PIXEL HAVEN',500,66);ctx.shadowBlur=0;ctx.font='bold 12px system-ui';ctx.fillStyle='#e8d8b5';ctx.fillText('THE GRAND LOBBY',500,83);ctx.restore();
 // Red runner over the central floor tiles.
 for(let x=3;x<=6;x++)for(let y=3;y<=6;y++){const q=t(x,y);poly([[q.x,q.y-19],[q.x+34,q.y],[q.x,q.y+19],[q.x-34,q.y]],(x+y)%2?'#934c60':'#ad5964','#d6a36a',2)}
 // Architectural highlights.
 line(118,233,499,24,'#d8b77e',4);line(501,24,883,233,'#d8b77e',4);
 // Furniture set dressing, in back-to-front tile order.
 const objects=[
  {x:0,y:0,fn:()=>plant(0,0,.95)},
  {x:0,y:7,fn:()=>plant(0,7,.9)},
  {x:7,y:0,fn:()=>plant(7,0,.9)},
  {x:2,y:2,fn:()=>{box(2,2,33,19,30,'#e5c78d','#624a48','#a6795a');const p=t(2,2);ctx.font='bold 12px system-ui';ctx.fillStyle='#402e39';ctx.textAlign='center';ctx.fillText('RECEPTION',p.x,p.y-38)}},
  {x:2,y:6,fn:()=>sofa(2,6)},
  {x:6,y:2,fn:()=>sofa(6,2)},
  {x:3,y:7,fn:()=>table(3,7)},
  {x:7,y:3,fn:()=>table(7,3)},
  {x:1,y:5,fn:()=>lamp(1,5)},
  {x:5,y:1,fn:()=>lamp(5,1)},
  {x:7,y:7,fn:()=>{const p=t(7,7),X=p.x,Y=p.y;ellipse(X,Y+5,40,13,'#1c3e4d55');isoBox(X,Y,32,20,18,'#c6e7ec','#567c93','#79a9bd');ellipse(X,Y-18,24,9,'#7fe2ef');for(let i=-2;i<=2;i++){const xx=X+i*9;line(xx,Y-27,xx+i*2,Y-55-Math.cos(i)*6,'#91f3ff',2)}ellipse(X,Y-57,10,5,'#d0ffff')}}
 ];
 objects.sort((a,b)=>a.x+a.y-b.x-b.y);objects.forEach(o=>o.fn());
 // Subtle warm light spots and floor gleam.
 for(const [x,y] of [[1,5],[5,1],[7,7]]){const q=t(x,y);const g=ctx.createRadialGradient(q.x,q.y,1,q.x,q.y,72);g.addColorStop(0,'#f9d88a22');g.addColorStop(1,'#f9d88a00');ctx.fillStyle=g;ctx.fillRect(q.x-72,q.y-72,144,144)}
}

function render(){ctx.clearRect(0,0,1000,660);drawRoom();const isLobby=room&&Number(room.id)===1;if(isLobby)lobbyDecor();const decorations=isLobby&&window.pixelLobbyObjects?window.pixelLobbyObjects:[];const entities=[...decorations.map(f=>({...f,type:'decor'})),...furniture.map(f=>({...f,type:'f'})),...players.values()].sort((a,b)=>(a.x+a.y)-(b.x+b.y));for(const e of entities)e.type==='decor'?window.drawPixelLobbyObject(e):e.type==='f'?drawFurniture(e):drawAvatar(e);requestAnimationFrame(render)}requestAnimationFrame(render);
function clickTile(e){if(!room)return;const r=canvas.getBoundingClientRect(),px=(e.clientX-r.left)*1000/r.width,py=(e.clientY-r.top)*660/r.height;const dx=(px-500)/43,dy=(py-118)/24;const x=Math.floor((dx+dy)/2+.5),y=Math.floor((dy-dx)/2+.5);if(x<0||y<0||x>9||y>9)return;if(selected){socket.emit('furniture:place',{kind:selected,x,y},a=>{if(a.error)toast(a.error);else{selected=null;$('#placement').textContent='';loadInventory()}})}else{socket.emit('player:move',{x,y})}}
canvas.addEventListener('click',clickTile);
function chatLine(username,body){} // Chat is displayed above avatars, not in a separate message window.
function updateGuests(){$('#guests').replaceChildren();for(const p of players.values()){const el=document.createElement('div');el.className='guest';el.textContent='● '+p.user.username;$('#guests').append(el)}$('#online').textContent=players.size+' guests online'}
function join(id){socket.emit('room:join',id,data=>{if(data.error)return toast(data.error);room=data.room;$('#roomTitle').textContent='🏨 '+room.name;furniture=data.furniture;players=new Map(data.players.map(p=>[p.socketId,p]));chatBubbles.clear();updateGuests()})}
function connect(){socket=io({auth:{token}});socket.on('connect',()=>join(1));socket.on('connect_error',e=>toast(e.message));socket.on('player:joined',p=>{players.set(p.socketId,p);updateGuests()});socket.on('player:left',id=>{players.delete(id);updateGuests()});socket.on('player:moved',p=>{const a=players.get(p.socketId);if(a){a.x=p.x;a.y=p.y}});socket.on('chat:message',m=>{if(m.socketId&&players.has(m.socketId))chatBubbles.set(m.socketId,{text:m.body,until:Date.now()+6500})});socket.on('furniture:added',f=>furniture.push(f));socket.on('furniture:removed',id=>{furniture=furniture.filter(f=>f.id!==id)});socket.on('disconnect',()=>{$('#online').textContent='Disconnected'})}
async function loadRooms(){const rooms=await api('/rooms');$('#rooms').replaceChildren();for(const r of rooms){const b=document.createElement('div');b.className='roomButton';b.textContent='🚪 '+r.name;const s=document.createElement('small');s.textContent=r.description||'Visit this room';b.append(s);b.onclick=()=>join(r.id);$('#rooms').append(b)}}
async function loadInventory(){inventory=await api('/inventory');$('#inventory').replaceChildren();for(const item of inventory.filter(i=>i.quantity>0)){const b=document.createElement('button');b.className='invItem'+(selected===item.kind?' selected':'');b.textContent=(emoji[item.kind]||'📦')+' '+item.kind+' ×'+item.quantity;b.onclick=()=>{selected=selected===item.kind?null:item.kind;$('#placement').textContent=selected?'Placing '+selected+' — click a tile':'';loadInventory()};$('#inventory').append(b)}}
function renderCatalog(){for(const [kind,price] of Object.entries(catalog)){const b=document.createElement('div');b.className='shopItem';b.textContent=(emoji[kind]||'📦')+' '+kind;const s=document.createElement('small');s.textContent=price+' coins · Click to buy';b.append(s);b.onclick=async()=>{try{const r=await api('/buy','POST',{kind});me.coins=r.coins;identity();await loadInventory();toast('Purchased '+kind)}catch(e){toast(e.message)}};$('#catalog').append(b)}}
function identity(){$('#identity').textContent=me.username+' · 🪙 '+me.coins}
function avatarEditor(){const names={skin:'Skin',shirt:'Outfit',hair:'Hair'};$('#avatarEditor').replaceChildren();for(const key of Object.keys(names)){const label=document.createElement('label');label.textContent=names[key];const sel=document.createElement('select');for(const c of colors){const o=document.createElement('option');o.value=c;o.textContent=c;o.style.background=c;sel.append(o)}sel.value=me.avatar[key];sel.onchange=async()=>{try{me=await api('/avatar','PATCH',{...me.avatar,[key]:sel.value});const p=players.get(socket?.id);if(p)p.user.avatar=me.avatar;toast('Avatar saved (rejoin to update other players)')}catch(e){toast(e.message)}};label.append(sel);$('#avatarEditor').append(label)}}
async function start(){try{me=await api('/me');$('#authOverlay').style.display='none';identity();avatarEditor();catalog=await api('/catalog');renderCatalog();await Promise.all([loadRooms(),loadInventory()]);connect()}catch{localStorage.removeItem('pixel_token');$('#authOverlay').style.display='grid'}}
$('#authForm').onsubmit=async e=>{e.preventDefault();try{const r=await api(authRegister?'/register':'/login','POST',{username:$('#username').value,password:$('#password').value});token=r.token;localStorage.setItem('pixel_token',token);me=r.user;location.reload()}catch(e){$('#authError').textContent=e.message}};
$('#authToggle').onclick=()=>{authRegister=!authRegister;$('#authTitle').textContent=authRegister?'Create account':'Welcome back';$('#authSubmit').textContent=authRegister?'Sign up':'Log in';$('#authToggle').textContent=authRegister?'Already registered? Log in':'New here? Create an account'};
$('#chatForm').onsubmit=e=>{e.preventDefault();const input=$('#chatInput');if(!input.value.trim())return;socket.emit('chat:send',input.value,a=>{if(a.error)toast(a.error)});input.value=''};
$('#newRoom').onclick=async()=>{const name=prompt('Name your new room (3-64 characters)');if(!name)return;try{const r=await api('/rooms','POST',{name});await loadRooms();join(r.id)}catch(e){toast(e.message)}};
if(token)start();
