/* Pixel Haven v4: procedural pixel-sprite atlas and interpolated multiplayer avatars.
   No external art dependencies. Original artwork; frontend-only enhancement. */
(() => {
  'use strict';
  const atlas = new Map();
  const motion = new Map();
  const PIXEL = 2;
  const palette = {
    outline:'#202338', shadow:'#17233a', eye:'#23263a', mouth:'#a75f65',
    jeans:'#304665', shoes:'#171c30'
  };
  function rgb(hex, fallback) { return /^#[0-9a-f]{6}$/i.test(hex||'') ? hex : fallback; }
  function tint(hex, amount) {
    const n=parseInt(hex.slice(1),16);
    const ch=k=>Math.max(0,Math.min(255,((n>>k)&255)+amount)).toString(16).padStart(2,'0');
    return '#'+ch(16)+ch(8)+ch(0);
  }
  function makeSprite(avatar, dir, frame) {
    const skin=rgb(avatar.skin,'#e8ad7d'), shirt=rgb(avatar.shirt,'#4b86e8'), hair=rgb(avatar.hair,'#493323');
    const key=[skin,shirt,hair,dir,frame].join(':');
    if(atlas.has(key)) return atlas.get(key);
    const c=document.createElement('canvas');c.width=34;c.height=53;
    const g=c.getContext('2d');g.imageSmoothingEnabled=false;
    const block=(x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),w,h)};
    const back=dir==='back'||dir.startsWith('back-'), side=dir==='left'||dir==='right', diagonal=dir.includes('-'), flip=dir==='left'||dir.endsWith('-left');
    g.save();if(flip){g.translate(34,0);g.scale(-1,1)}
    // Four distinct walk poses: planted feet, crossing stride, and head counter-sway.
    const walking=frame!==0,phase=frame===1?1:frame===2?0:frame===3?-1:0;
    const lift=walking&&(frame===1||frame===3)?1:0;
    const headShift=phase===1?-1:phase===-1?1:0;
    const bodyShift=phase===1?1:phase===-1?-1:0;
    const leftStride=phase*4,rightStride=-phase*4;
    // Far leg first, then near leg: stepping actually changes the silhouette.
    block(19+rightStride,37+Math.max(0,phase)*2,7,13,palette.outline);
    block(20+rightStride,38+Math.max(0,phase)*2,5,10,palette.jeans);
    block(19+rightStride,48+Math.max(0,phase)*2,9,4,palette.shoes);
    block(20+rightStride,49+Math.max(0,phase)*2,5,1,'#e5e5ed');
    block(9+leftStride,37+Math.max(0,-phase)*2,7,13,palette.outline);
    block(10+leftStride,38+Math.max(0,-phase)*2,5,10,palette.jeans);
    block(8+leftStride,48+Math.max(0,-phase)*2,10,4,palette.shoes);
    block(9+leftStride,49+Math.max(0,-phase)*2,6,1,'#e5e5ed');
    // Opposing arm swing, subtle torso bob and shoulder rotation.
    const bob=walking?(frame===2?1:-lift):0;
    block(8+bodyShift,23+bob,19,18,palette.outline);
    block(9+bodyShift,24+bob,17,16,shirt);
    block(9+bodyShift,24+bob,3,15,tint(shirt,-30));
    block(22+bodyShift,24+bob,3,15,tint(shirt,-24));
    const leftArm=-phase*3,rightArm=phase*3;
    block(5+leftArm,26+bob+Math.max(0,phase),5,13,palette.outline);
    block(6+leftArm,27+bob+Math.max(0,phase),3,10,shirt);
    block(26+rightArm,26+bob+Math.max(0,-phase),5,13,palette.outline);
    block(27+rightArm,27+bob+Math.max(0,-phase),3,10,shirt);
    block(6+leftArm,36+bob+Math.max(0,phase),3,3,skin);
    block(27+rightArm,36+bob+Math.max(0,-phase),3,3,skin);
    if(!back){block(16+bodyShift,25+bob,2,13,tint(shirt,55));block(15+bodyShift,24+bob,4,3,'#f3eee4')}else if(diagonal){block(23+bodyShift,25+bob,2,12,tint(shirt,-48));}
    // Head moves independently of the torso; hair and face follow the tilt.
    g.save();g.translate(headShift,bob+(walking&&frame===2?1:0));
    block(14,20,8,6,palette.outline);block(15,20,6,5,skin);
    block(side?11:diagonal?10:9,6,side?16:diagonal?17:18,18,palette.outline);
    block(side?12:diagonal?11:10,7,side?14:diagonal?15:16,16,skin);
    block(side?13:diagonal?12:11,18,side?12:diagonal?13:14,4,tint(skin,-16));
    block(9,4,19,9,palette.outline);block(10,3,17,8,hair);
    block(12,2,12,3,tint(hair,20));block(8,8,5,8,hair);
    block(24,7,4,8,hair);block(11,5,6,2,tint(hair,33));
    if(back){block(11,12,15,9,hair);block(13,20,11,2,tint(hair,-20));if(diagonal){block(23,15,2,5,tint(skin,-20));block(24,13,2,2,hair)}}
    else if(side){block(21,14,2,2,palette.eye);block(24,19,2,1,palette.mouth)}
    else if(diagonal){block(17,15,2,2,palette.eye);block(24,15,2,2,palette.eye);block(21,20,3,1,palette.mouth);block(10,11,3,11,tint(hair,-15))}
    else {block(13,15,2,2,palette.eye);block(22,15,2,2,palette.eye);block(17,20,4,1,palette.mouth)}
    g.restore();
    g.restore();
    atlas.set(key,c);if(atlas.size>512)atlas.clear();
    return c;
  }
  function direction(dx,dy,old='front') {
    if(Math.hypot(dx,dy)<.01)return old;
    // Convert grid travel into actual on-screen movement before choosing facing.
    const sx=dx-dy,sy=(dx+dy)*24/43;
    const angle=Math.atan2(sy,sx);
    const sectors=['right','front-right','front','front-left','left','back-left','back','back-right'];
    const index=((Math.round(angle/(Math.PI/4))%8)+8)%8;
    return sectors[index];
  }
  const original=window.drawAvatar;
  window.drawAvatar=function(p) {
    if(!p||!p.user)return original(p);
    const id=p.socketId||p.user.id||p.user.username;
    let m=motion.get(id);
    if(!m){m={x:p.x,y:p.y,dir:'front',last:performance.now(),stride:0};motion.set(id,m)}
    const now=performance.now(),dt=Math.min((now-m.last)/1000,.06);m.last=now;
    const dx=p.x-m.x,dy=p.y-m.y,dist=Math.hypot(dx,dy);
    if(dist>.001){m.dir=direction(dx,dy,m.dir);const step=Math.min(dist,dt*4.3);m.x+=dx/dist*step;m.y+=dy/dist*step;m.stride+=step*2.8}
    const walking=dist>.045;
    const frame=walking?1+Math.floor(m.stride)%3:0;
    const pos=tile(m.x,m.y),x=pos.x,y=pos.y;
    ctx.fillStyle='#10182a66';ctx.beginPath();ctx.ellipse(x,y+4,17,6,0,0,Math.PI*2);ctx.fill();
    const sprite=makeSprite(p.user.avatar||{},m.dir,frame);
    ctx.save();ctx.imageSmoothingEnabled=false;
    ctx.drawImage(sprite,Math.round(x-34),Math.round(y-104),68,106);
    ctx.restore();
    const name=String(p.user.username||'Guest').slice(0,24);
    ctx.font='bold 12px system-ui';ctx.textAlign='center';
    const width=Math.min(180,ctx.measureText(name).width+18);
    ctx.fillStyle='#10192de8';ctx.fillRect(x-width/2,y-125,width,21);
    ctx.fillStyle='#fff';ctx.fillText(name,x,y-110);

  };
  // Expose interpolated avatar feet for speech bubble placement.
  window.pixelAvatarPosition=id=>{const m=motion.get(id);return m?tile(m.x,m.y):null;};
  // Remove old interpolation entries after room transitions and disconnects.
  setInterval(()=>{if(typeof players==='undefined')return;for(const id of motion.keys())if(!players.has(id))motion.delete(id)},10000);
  console.info('[Pixel Haven] v4.9 eight-direction avatar walk cycle loaded');
})();
