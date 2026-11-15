const $=s=>document.querySelector(s),canvas=$('#game'),ctx=canvas.getContext('2d');
let token=localStorage.getItem('pixel_token'),me=null,socket=null,room=null,players=new Map(),furniture=[],selected=null,rotateMode=false,rotationTarget=null,catalog={},inventory=[],authRegister=false,chatBubbles=new Map();
const colors=['#e8ad7d','#a96b46','#f2cba5','#6d4535','#4b86e8','#ef7d82','#72c49a','#9b7de5','#493323','#1c2535','#f5ca59','#ffffff'];
const emoji={chair:'🪑',sofa:'🛋️',table:'🪵',plant:'🪴',lamp:'💡',bed:'🛏️',arcade:'🕹️',club_sofa:'🛋️',royal_throne:'👑',ice_cream_machine:'🍦',fridge:'🧊',smoke_machine:'🌫️',christmas_tree:'🎄',christmas_sofa:'🛋️',christmas_fireplace:'🔥',snowman:'⛄',gift_stack:'🎁',candy_cane_lamp:'🍬',festive_rug:'❄️',gold_bar:'🪙',nickel:'🥉',quarter:'🪙'};
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

const heldNames={icecream_vanilla:'Vanilla ice cream',icecream_strawberry:'Strawberry ice cream',icecream_chocolate:'Chocolate ice cream',carrot:'Carrot',blackcurrant:'Blackcurrant'};
function drawHeldFood(p){
 if(!p.held)return;
 const pt=window.pixelAvatarPosition?.(p.socketId)||tile(p.x,p.y);
 const x=pt.x+20,y=pt.y-51;
 ctx.save();ctx.lineWidth=1.5;ctx.strokeStyle='#3c3440';
 // Food is positioned in the avatar's hand and moves with the character.
 if(p.held.startsWith('icecream_')){
  const color={icecream_vanilla:'#fff3c9',icecream_strawberry:'#f5a2b8',icecream_chocolate:'#8b513c'}[p.held]||'#fff3c9';
  ctx.fillStyle='#d9a46c';ctx.beginPath();ctx.moveTo(x-6,y+2);ctx.lineTo(x+6,y+2);ctx.lineTo(x,y+19);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y-2,8,Math.PI,0);ctx.lineTo(x+8,y+3);ctx.lineTo(x-8,y+3);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#ffffff77';ctx.fillRect(x-3,y-7,4,2);
 }else if(p.held==='carrot'){
  ctx.fillStyle='#ed8a2f';ctx.beginPath();ctx.moveTo(x-7,y-8);ctx.lineTo(x+7,y-8);ctx.lineTo(x,y+17);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.strokeStyle='#3c914c';ctx.lineWidth=3;for(const dx of [-5,0,5]){ctx.beginPath();ctx.moveTo(x,y-8);ctx.lineTo(x+dx,y-16);ctx.stroke()}
 }else if(p.held==='blackcurrant'){
  for(const [dx,dy] of [[-5,0],[3,-3],[0,5],[7,6]]){ctx.fillStyle='#392053';ctx.beginPath();ctx.arc(x+dx,y+dy,5,0,Math.PI*2);ctx.fill();ctx.stroke()}
  ctx.strokeStyle='#4d9b5a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y-3);ctx.lineTo(x+2,y-13);ctx.stroke();
 }
 ctx.restore();
}
function render(){ctx.clearRect(0,0,1000,660);drawRoom();const isLobby=room&&Number(room.id)===1;if(isLobby)lobbyDecor();const decorations=isLobby&&window.pixelLobbyObjects?window.pixelLobbyObjects:[];const entities=[...decorations.map(f=>({...f,type:'decor'})),...furniture.map(f=>({...f,type:'f'})),...players.values().map(p=>({...p,type:'player'}))].sort((a,b)=>((a.x+a.y)-(b.x+b.y))||((a.type==='player'?1:0)-(b.type==='player'?1:0)));for(const e of entities){if(e.type==='player'){drawAvatar(e);drawHeldFood(e)}else{window.pixelRoomFloorShadow?.(e);if(e.type==='decor')window.drawPixelLobbyObject(e);else drawFurniture(e)}}if(window.drawRoomChatBubbles)window.drawRoomChatBubbles();requestAnimationFrame(render)}requestAnimationFrame(render);
function clickTile(e){if(!room)return;const r=canvas.getBoundingClientRect(),px=(e.clientX-r.left)*1000/r.width,py=(e.clientY-r.top)*660/r.height;const dx=(px-500)/43,dy=(py-118)/24;const x=Math.floor((dx+dy)/2+.5),y=Math.floor((dy-dx)/2+.5);if(x<0||y<0||x>9||y>9)return;if(rotateMode){const item=furniture.find(f=>f.x===x&&f.y===y);if(item){rotationTarget=item.id;updateRotateControls();toast('Selected '+item.kind+' — press Rotate to turn it')}else toast('Click placed furniture to select it');return;}if(!selected){const dispenser=furniture.find(f=>['ice_cream_machine','fridge'].includes(f.kind)&&f.x===x&&f.y===y);if(dispenser){socket.emit('furniture:dispense',dispenser.id,a=>{if(a?.error)toast(a.error);else toast('Holding '+(heldNames[a.held]||'food')+' — use Drop Food to put it away')});return;}}if(!selected){const seat=furniture.find(f=>['chair','sofa','bed','club_sofa','royal_throne','christmas_sofa'].includes(f.kind)&&f.x===x&&f.y===y);if(seat){socket.emit('player:sit',seat.id,a=>{if(a?.error)toast(a.error)});return;}}if(selected){socket.emit('furniture:place',{kind:selected,x,y},a=>{if(a.error)toast(a.error);else{selected=null;$('#placement').textContent='';loadInventory()}})}else{socket.emit('player:move',{x,y})}}
canvas.addEventListener('click',clickTile);
function updateRotateControls(){
 const button=document.getElementById('furnitureRotate'),toggle=document.getElementById('furnitureEdit');
 if(button)button.disabled=!rotateMode||!rotationTarget||!socket?.connected;
 if(toggle){toggle.classList.toggle('active',rotateMode);toggle.setAttribute('aria-pressed',String(rotateMode));toggle.textContent=rotateMode?'✓ Editing furniture':'✥ Edit furniture'}
}
document.getElementById('furnitureEdit')?.addEventListener('click',()=>{
 rotateMode=!rotateMode;rotationTarget=null;if(rotateMode)selected=null;
 updateRotateControls();toast(rotateMode?'Click furniture, then press Rotate':'Furniture editing closed');
});
document.getElementById('furnitureRotate')?.addEventListener('click',()=>{
 if(!rotationTarget||!socket?.connected)return;
 socket.emit('furniture:rotate',rotationTarget,response=>{if(response?.error)toast(response.error);else toast('Furniture rotated')});
});

function chatLine(username,body){} // Chat is displayed above avatars, not in a separate message window.
function updateGuests(){$('#guests').replaceChildren();for(const p of players.values()){const el=document.createElement('div');el.className='guest';el.textContent='● '+p.user.username;$('#guests').append(el)}$('#online').textContent=players.size+' guests online'}
function join(id){socket.emit('room:join',id,data=>{if(data.error)return toast(data.error);room=data.room;rotationTarget=null;updateRotateControls();$('#roomTitle').textContent='🏨 '+room.name;furniture=data.furniture;players=new Map(data.players.map(p=>[p.socketId,p]));chatBubbles.clear();const drop=document.getElementById('dropHeldFood');if(drop)drop.hidden=true;updateGuests()})}
function connect(){socket=io({auth:{token}});socket.on('connect',()=>join(1));socket.on('connect_error',e=>toast(e.message));socket.on('account:changed',async data=>{if(data&&Number.isFinite(Number(data.coins))&&data.coins!==undefined){me.coins=Number(data.coins);identity()}else await refreshCoinBalance()});socket.on('player:joined',p=>{players.set(p.socketId,p);updateGuests()});socket.on('player:left',id=>{players.delete(id);chatBubbles.delete(id);updateGuests()});socket.on('player:identity',p=>{const player=players.get(p.socketId);if(player){player.user=p.user;updateGuests()}});socket.on('player:avatar',p=>{const a=players.get(p.socketId);if(a)a.user.avatar=p.avatar});socket.on('player:held',p=>{const a=players.get(p.socketId);if(a)a.held=p.held;const drop=document.getElementById('dropHeldFood');if(drop&&p.socketId===socket.id)drop.hidden=!p.held});socket.on('player:pose',p=>{const a=players.get(p.socketId);if(a)a.pose=p.pose});socket.on('player:emote',p=>{const a=players.get(p.socketId);if(a)a.emote={name:p.name,until:p.until}});socket.on('player:moved',p=>{const a=players.get(p.socketId);if(a){a.x=p.x;a.y=p.y}});socket.on('chat:message',m=>{if(m.socketId&&players.has(m.socketId)){const now=Date.now(),entry=chatBubbles.get(m.socketId)||{messages:[]};entry.messages=entry.messages.filter(v=>v.until>now);entry.messages.push({text:String(m.body||''),until:now+7500});entry.messages=entry.messages.slice(-3);chatBubbles.set(m.socketId,entry)}});socket.on('furniture:added',f=>furniture.push(f));socket.on('furniture:rotated',data=>{const f=furniture.find(item=>item.id===data.id);if(f)f.rotation=data.rotation;});socket.on('furniture:removed',id=>{furniture=furniture.filter(f=>f.id!==id)});socket.on('moderation:warning',data=>{alert('Hotel staff warning: '+String(data.reason||'Please follow hotel rules'))});socket.on('trade:updated',()=>{toast('Your trade has been updated');loadInventory().catch(()=>{})});socket.on('disconnect',()=>{$('#online').textContent='Disconnected'})}
async function loadRooms(){const rooms=await api('/rooms');$('#rooms').replaceChildren();for(const r of rooms){const b=document.createElement('div');b.className='roomButton';b.dataset.roomId=String(r.id);b.textContent='🚪 '+r.name;const s=document.createElement('small');s.textContent=r.description||'Visit this room';b.append(s);b.onclick=()=>join(r.id);$('#rooms').append(b)}}
async function loadInventory(){inventory=await api('/inventory');$('#inventory').replaceChildren();for(const item of inventory.filter(i=>i.quantity>0)){const b=document.createElement('button');b.className='invItem'+(selected===item.kind?' selected':'');b.textContent=(emoji[item.kind]||'📦')+' '+item.kind+' ×'+item.quantity;b.onclick=()=>{if(['gold_bar','nickel','quarter'].includes(item.kind)){toast('Trade or redeem this coin token; it cannot be placed on the floor');return;}selected=selected===item.kind?null:item.kind;$('#placement').textContent=selected?'Placing '+selected+' — click a tile':'';loadInventory()};$('#inventory').append(b);if(['gold_bar','nickel','quarter'].includes(item.kind)){const redeem=document.createElement('button');redeem.type='button';redeem.className='invItem';redeem.textContent='💰 Redeem 1';redeem.onclick=async()=>{try{const result=await api('/redeem','POST',{kind:item.kind,quantity:1});me.coins=result.coins;identity();await loadInventory();toast('Redeemed '+item.kind)}catch(e){toast(e.message)}};$('#inventory').append(redeem)}}}
function renderCatalog(){
 const root=$('#catalog');root.replaceChildren();
 const collections=[
  {name:'Essentials',icon:'🏡',description:'Everyday comforts',items:['chair','sofa','table','plant','lamp','bed','arcade']},
  {name:'Royal & Club',icon:'👑',description:'Exclusive-looking luxury pieces',items:['club_sofa','royal_throne']},
  {name:'Novelty',icon:'🍦',description:'Machines and playful decorations',items:['ice_cream_machine','fridge','smoke_machine']},
  {name:'Winter Wonderland',icon:'🎄',description:'Seasonal festive furniture',items:['christmas_tree','christmas_sofa','christmas_fireplace','snowman','gift_stack','candy_cane_lamp','festive_rug']},
  {name:'Coin Exchange',icon:'💰',description:'Physical currency you can trade or redeem',items:['nickel','quarter','gold_bar']}
 ];
 const header=document.createElement('div');header.className='catalogHero';
 header.innerHTML='<div class="catalogEyebrow">PIXEL HAVEN • FURNI SHOP</div><strong>Decorate your world</strong><small>Discover themed collections and collect original furniture.</small>';
 const tabs=document.createElement('div');tabs.className='catalogTabs';
 const grid=document.createElement('div');grid.className='catalogGrid';
 const title=document.createElement('div');title.className='catalogCollectionTitle';
 root.append(header,tabs,title,grid);
 let current=0;
 function show(index){
  current=index;tabs.querySelectorAll('button').forEach((btn,i)=>{btn.classList.toggle('active',i===index);btn.setAttribute('aria-pressed',String(i===index))});
  const group=collections[index];title.textContent=group.icon+' '+group.name+' · '+group.description;grid.replaceChildren();
  for(const kind of group.items){
   if(catalog[kind]===undefined)continue;
   const item=document.createElement('article');item.className='catalogCard';
   const picture=document.createElement('div');picture.className='catalogPicture';
   const preview=document.createElement('canvas');preview.width=128;preview.height=128;preview.setAttribute('aria-label',kind.replaceAll('_',' ')+' preview');picture.append(preview);
   window.drawFurniturePreview?.(preview,kind);
   const name=document.createElement('strong');name.textContent=kind.replaceAll('_',' ').replace(/\\b\\w/g,c=>c.toUpperCase());
   const price=document.createElement('span');price.className='catalogPrice';price.textContent='🪙 '+catalog[kind];
   const buy=document.createElement('button');buy.type='button';buy.textContent='Buy';
   buy.onclick=async()=>{buy.disabled=true;try{const result=await api('/buy','POST',{kind});me.coins=result.coins;identity();await loadInventory();toast('Purchased '+name.textContent)}catch(e){await refreshCoinBalance();toast(e.message)}finally{buy.disabled=false}};
   item.append(picture,name,price,buy);grid.append(item);
  }
 }
 collections.forEach((group,i)=>{const button=document.createElement('button');button.type='button';button.textContent=group.icon+' '+group.name;button.setAttribute('aria-pressed','false');button.onclick=()=>show(i);tabs.append(button)});
 show(0);
}
const shopWindow=document.getElementById('shopWindow');
document.getElementById('shopOpen')?.addEventListener('click',()=>{shopWindow.hidden=false;refreshCoinBalance();document.getElementById('shopClose')?.focus()});
document.getElementById('shopClose')?.addEventListener('click',()=>{shopWindow.hidden=true;document.getElementById('shopOpen')?.focus()});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!shopWindow.hidden){shopWindow.hidden=true;document.getElementById('shopOpen')?.focus()}});
function identity(){$('#identity').textContent=(me.profile?.name||me.username)+' · 🪙 '+me.coins}
async function refreshCoinBalance(){try{const current=await api('/me');if(me){me.coins=current.coins;me.role=current.role;identity()}return current.coins}catch(e){console.warn('Unable to refresh credits',e);return null}}
window.pixelRefreshCoins=refreshCoinBalance;
function avatarEditor(){
 const editor=$('#avatarEditor');editor.replaceChildren();
 const groups=[
 ['Appearance',[['skin','Skin tone',colors],['hair','Hair color',colors],['hairstyle','Hairstyle',['short','spiky','long','buzz','sidepart']],['face','Expression',['smile','neutral','happy','wink']]]],
 ['Outfit',[['outfit','Top style',['tee','hoodie','jacket','sweater','vest','dress']],['shirt','Top color',colors],['pants','Bottoms',['jeans','chinos','shorts','skirt']],['pantsColor','Bottom color',colors],['shoes','Footwear',['sneakers','boots','loafers']],['shoeColor','Shoe color',colors]]],
 ['Accessories',[['accessory','Accessory',['none','glasses','sunglasses','cap','beanie','headphones']]]]
 ];
 let draft={...me.avatar},direction=0,busy=false;
 const views=['front','right','back','left'];
 const preview=document.createElement('canvas');preview.width=120;preview.height=152;preview.className='avatarPreview';
 const redraw=()=>{const g=preview.getContext('2d');g.clearRect(0,0,120,152);window.pixelAvatarPreview?.(g,draft,views[direction])};
 const viewBar=document.createElement('div');viewBar.className='wardrobeViews';
 const viewLabel=document.createElement('span');viewLabel.textContent='Front';
 const backBtn=document.createElement('button');backBtn.type='button';backBtn.textContent='◀';
 const nextBtn=document.createElement('button');nextBtn.type='button';nextBtn.textContent='▶';
 const turn=n=>{direction=(direction+n+4)%4;viewLabel.textContent=views[direction].toUpperCase();redraw()};
 backBtn.onclick=()=>turn(-1);nextBtn.onclick=()=>turn(1);viewBar.append(backBtn,viewLabel,nextBtn);
 const status=document.createElement('p');status.className='wardrobeStatus';status.textContent='Changes save automatically';
 editor.append(preview,viewBar,status);
 const selectors=[];
 for(const [group,fields] of groups){
  const heading=document.createElement('h4');heading.className='wardrobeHeading';heading.textContent=group;editor.append(heading);
  const wrap=document.createElement('div');wrap.className='wardrobeGrid';
  for(const [key,name,values] of fields){
   const label=document.createElement('label');label.textContent=name;const sel=document.createElement('select');sel.dataset.field=key;
   for(const v of values){const option=document.createElement('option');option.value=v;option.textContent=v.startsWith('#')?v:v.replace(/(^|\\s)\\w/g,m=>m.toUpperCase());if(v.startsWith('#'))option.style.background=v;sel.append(option)}
   sel.value=draft[key]||({pants:'jeans',pantsColor:'#4b86e8',shoes:'sneakers',shoeColor:'#1c2535'}[key]||values[0]);
   draft[key]=sel.value;selectors.push(sel);
   sel.onchange=async()=>{
    if(busy)return;
    const before={...draft};draft[key]=sel.value;redraw();busy=true;selectors.forEach(x=>x.disabled=true);status.textContent='Saving…';
    try{me=await api('/avatar','PATCH',draft);draft={...me.avatar};status.textContent='✓ Saved for everyone'}
    catch(e){draft=before;sel.value=before[key];redraw();status.textContent='Could not save';toast(e.message)}
    finally{busy=false;selectors.forEach(x=>x.disabled=false)}
   };
   label.append(sel);wrap.append(label);
  }
  editor.append(wrap);
 }
 redraw();
}
async function start(){try{me=await api('/me');window.pixelHotelUserId=me.id;$('#authOverlay').style.display='none';identity();avatarEditor();catalog=await api('/catalog');renderCatalog();await Promise.all([loadRooms(),loadInventory()]);connect()}catch{localStorage.removeItem('pixel_token');$('#authOverlay').style.display='grid'}}
$('#authForm').onsubmit=async e=>{e.preventDefault();try{const r=await api(authRegister?'/register':'/login','POST',{username:$('#username').value,password:$('#password').value});token=r.token;localStorage.setItem('pixel_token',token);me=r.user;location.reload()}catch(e){$('#authError').textContent=e.message}};
$('#authToggle').onclick=()=>{authRegister=!authRegister;$('#authTitle').textContent=authRegister?'Create account':'Welcome back';$('#authSubmit').textContent=authRegister?'Sign up':'Log in';$('#authToggle').textContent=authRegister?'Already registered? Log in':'New here? Create an account'};
$('#chatForm').onsubmit=e=>{e.preventDefault();const input=$('#chatInput'),message=input.value.trim();if(!message||!socket?.connected)return;input.disabled=true;socket.emit('chat:send',message,a=>{input.disabled=false;if(a?.error){toast(a.error)}else{input.value=''}input.focus()})};
document.addEventListener('keydown',e=>{if(e.key!=='Enter'||e.repeat||e.ctrlKey||e.altKey||e.metaKey||e.shiftKey)return;const target=e.target;if(target?.closest?.('input,textarea,select,button,[contenteditable="true"],form'))return;if(document.getElementById('authOverlay')?.style.display!=='none')return;if(!document.getElementById('hotelHub')?.hidden)return;e.preventDefault();$('#chatInput').focus()});
$('#newRoom').onclick=async()=>{const name=prompt('Name your new room (3-64 characters)');if(!name)return;try{const r=await api('/rooms','POST',{name});await loadRooms();join(r.id)}catch(e){toast(e.message)}};
if(token)start();

/* v5.0: in-room emote toolbar and furniture interaction. */
document.querySelectorAll('[data-emote]').forEach(button=>button.addEventListener('click',()=>{
 if(!socket?.connected)return toast('Connect to the hotel first');
 socket.emit('player:emote',button.dataset.emote,a=>{if(a?.error)toast(a.error)});
}));
document.getElementById('standUp')?.addEventListener('click',()=>socket?.emit('player:stand',null,a=>{if(a?.error)toast(a.error)}));

// Food interaction button, shown only while holding a dispensed item.
const dropHeldButton=document.createElement('button');dropHeldButton.type='button';dropHeldButton.id='dropHeldFood';dropHeldButton.className='dropHeldFood';dropHeldButton.textContent='✋ Drop Food';dropHeldButton.hidden=true;document.querySelector('.canvasWrap')?.append(dropHeldButton);dropHeldButton.onclick=()=>socket?.emit('player:dropHeld',null,a=>{if(a?.error)toast(a.error)});
