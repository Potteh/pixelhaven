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
  // Original hotel-pixel proportions: broad expressive head, compact torso,
  // outlined clothing and shoes, directional hair and four walk poses.
  function makeSprite(avatar,dir,frame){
    const skin=rgb(avatar.skin,'#e8ad7d'),shirt=rgb(avatar.shirt,'#4b86e8'),hair=rgb(avatar.hair,'#493323');
    const hairstyle=['short','spiky','long','buzz','sidepart'].includes(avatar.hairstyle)?avatar.hairstyle:'short';
    const face=['smile','neutral','happy','wink'].includes(avatar.face)?avatar.face:'smile';
    const outfit=['tee','hoodie','jacket'].includes(avatar.outfit)?avatar.outfit:'tee';
    const accessory=['none','glasses','cap','headphones'].includes(avatar.accessory)?avatar.accessory:'none';
    const key=[skin,shirt,hair,dir,frame,hairstyle,face,outfit,accessory].join(':');
    if(atlas.has(key))return atlas.get(key);
    const c=document.createElement('canvas');c.width=40;c.height=56;
    const g=c.getContext('2d');g.imageSmoothingEnabled=false;
    const rect=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(Math.round(x),Math.round(y),w,h)};
    const back=dir==='back'||dir.startsWith('back-'),side=dir==='left'||dir==='right';
    const diag=dir.includes('-'),flip=dir==='left'||dir.endsWith('-left');
    const phase=frame===1?1:frame===3?-1:0,bob=frame===2?1:frame? -1:0;
    const edge='#292637',pants='#354969',pantLight='#526783',shoe='#252335';
    g.save();if(flip){g.translate(40,0);g.scale(-1,1)}
    // Two independently animated, thick legs and oversized sneakers.
    for(const [x,step,far] of [[12,phase*3,false],[23,-phase*3,true]]){
      const yy=38+(step>0?2:0);
      rect(x+step,yy,7,12,edge);rect(x+step+1,yy+1,5,10,pants);
      rect(x+step+1,yy+1,2,8,pantLight);
      rect(x+step-2,yy+10,11,5,edge);rect(x+step-1,yy+11,10,3,shoe);
      rect(x+step-1,yy+13,10,1,'#ddd8ce');
    }
    // Layered shirt with chunky cuffs, hem, neckline and shaded sides.
    const torso=phase===1?1:phase===-1?-1:0;
    rect(10+torso,24+bob,22,18,edge);
    rect(11+torso,25+bob,20,15,shirt);
    rect(11+torso,25+bob,4,15,tint(shirt,-35));
    rect(27+torso,25+bob,3,15,tint(shirt,-22));
    rect(14+torso,39+bob,14,2,tint(shirt,-40));
    for(const [x,step] of [[5,-phase*2],[31,phase*2]]){
      rect(x+step,26+bob,6,13,edge);
      rect(x+step+1,27+bob,4,9,shirt);
      rect(x+step+1,36+bob,4,4,skin);
      rect(x+step+1,38+bob,4,2,tint(skin,-22));
    }
    if(outfit==='hoodie'){rect(12+torso,23+bob,18,5,tint(shirt,-48));rect(15+torso,34+bob,12,5,tint(shirt,-18));rect(19+torso,29+bob,2,6,'#e9d8c5')}
    if(outfit==='jacket'){rect(12+torso,25+bob,5,14,tint(shirt,-55));rect(25+torso,25+bob,5,14,tint(shirt,-55));rect(20+torso,27+bob,2,12,'#d4c3a6')}
    if(!back){
      rect(18+torso,25+bob,6,3,'#f4eee0');
      rect(19+torso,28+bob,3,10,tint(shirt,30));
      rect(13+torso,32+bob,2,5,tint(shirt,-48));
    }else{
      rect(19+torso,26+bob,2,12,tint(shirt,-27));
    }
    // Wide pixel face with visible jaw and ears; head sways against torso.
    g.save();g.translate(-phase,bob);
    const hx=diag?10:side?12:9,hw=diag?22:side?19:24;
    rect(hx,7,hw,19,edge);
    rect(hx+1,8,hw-2,16,skin);
    rect(hx+2,22,hw-4,4,tint(skin,-20));
    rect(hx+5,25,hw-10,2,edge);
    if(!back){
      rect(hx-2,16,3,7,edge);rect(hx-1,17,2,5,skin);
      rect(hx+hw-1,16,3,7,edge);rect(hx+hw,17,2,5,tint(skin,-18));
      rect(hx+3,11,hw-6,3,tint(skin,10));
      if(side){
        rect(25,15,3,3,edge);rect(26,15,1,1,'#fff');
        rect(29,20,3,2,tint(skin,-42));rect(27,23,3,1,'#8c5054');
      }else if(diag){
        rect(19,15,3,3,edge);rect(20,15,1,1,'#fff');
        rect(28,15,2,3,edge);
        rect(25,21,3,2,tint(skin,-35));rect(23,24,4,1,'#98585c');
      }else{
        rect(15,15,3,3,edge);rect(16,15,1,1,'#fff');
        rect(26,15,3,3,edge);rect(27,15,1,1,'#fff');
        rect(21,19,3,2,tint(skin,-32));
        if(face==='wink'){rect(15,16,3,1,edge)}
        if(face==='happy'){rect(19,22,7,3,'#a65f61');rect(21,24,3,1,'#f2c0b4')}
        else if(face==='neutral')rect(19,23,7,1,'#a65f61');
        else rect(19,23,7,2,'#a65f61');
      }
    }
    // Distinct thick hairline, sideburns and highlights in all views.
    rect(hx-1,5,hw+2,8,edge);
    rect(hx,4,hw,8,hair);
    rect(hx+3,2,hw-6,5,hair);
    rect(hx+6,2,Math.max(5,hw-12),2,tint(hair,28));
    rect(hx,10,4,8,hair);
    rect(hx+hw-4,9,4,7,tint(hair,-17));
    if(back){
      rect(hx+1,11,hw-2,13,hair);
      rect(hx+4,20,hw-8,4,tint(hair,-22));
      rect(hx+4,7,hw-8,2,tint(hair,18));
      if(diag){rect(hx+hw-3,15,3,8,tint(skin,-15))}
    }else{
      rect(hx+3,10,7,3,hair);
      rect(hx+hw-9,10,7,2,hair);
      if(side||diag)rect(hx+1,12,3,10,tint(hair,-14));
    }
    if(hairstyle==='spiky'){for(let i=0;i<4;i++)rect(hx+2+i*5,Math.max(0,3-(i%2)*2),4,5,hair)}
    if(hairstyle==='long'){rect(hx-1,14,5,17,hair);rect(hx+hw-4,13,5,18,tint(hair,-14))}
    if(hairstyle==='buzz'){rect(hx,3,hw,6,tint(hair,-10));rect(hx+2,2,hw-4,2,hair)}
    if(hairstyle==='sidepart'){rect(hx+1,3,hw-3,5,hair);rect(hx+4,3,3,4,tint(hair,40));rect(hx+hw-7,6,7,3,tint(hair,-20))}
    if(accessory==='glasses'&&!back){rect(14,14,8,5,edge);rect(24,14,8,5,edge);rect(22,15,2,2,edge);rect(15,15,6,3,'#b8e6ee66');rect(25,15,6,3,'#b8e6ee66')}
    if(accessory==='cap'){rect(hx-2,3,hw+4,7,'#263d60');rect(hx+2,1,hw-4,5,tint(shirt,-40));if(!back)rect(hx+hw-2,9,8,3,'#263d60')}
    if(accessory==='headphones'){rect(hx-3,9,4,15,'#263d60');rect(hx+hw-1,9,4,15,'#263d60');rect(hx-2,1,hw+4,3,'#51677c')}
    g.restore();g.restore();
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
    const seated=p.pose?.type==='sit';
    const walking=!seated&&dist>.045;
    const frame=walking?1+Math.floor(m.stride)%3:0;
    const pos=tile(m.x,m.y),x=pos.x,y=pos.y;
    ctx.fillStyle='#10182a66';ctx.beginPath();ctx.ellipse(x,y+4,17,6,0,0,Math.PI*2);ctx.fill();
    const sprite=makeSprite(p.user.avatar||{},m.dir,frame);
    ctx.save();ctx.imageSmoothingEnabled=false;
    if(seated){
      // Upper body remains upright while knees fold forward on the seat.
      const skin=rgb(p.user.avatar?.skin,'#e8ad7d');
      ctx.drawImage(sprite,0,0,40,40,Math.round(x-40),Math.round(y-96),80,80);
      ctx.fillStyle='#304665';ctx.fillRect(x-19,y-18,18,9);ctx.fillRect(x+1,y-18,18,9);
      ctx.fillStyle='#171c30';ctx.fillRect(x-21,y-10,19,7);ctx.fillRect(x+1,y-10,19,7);
    }else{
      const emote=p.emote?.until>Date.now()?p.emote.name:null;
      const bounce=emote==='cheer'?Math.abs(Math.sin(now/110))*7:emote==='dance'?Math.abs(Math.sin(now/145))*5:0;
      const sway=emote==='dance'?Math.sin(now/170)*8:emote==='laugh'?Math.sin(now/95)*2:0;
      ctx.translate(x,y-bounce);ctx.rotate(sway*Math.PI/180);
      ctx.drawImage(sprite,-40,-112,80,112);
      if(emote==='wave'||emote==='cheer'){
        const lift=emote==='wave'?Math.sin(now/125)*6:0;
        ctx.fillStyle=rgb(p.user.avatar?.shirt,'#4b86e8');ctx.fillRect(24,-94+lift,9,31);
        ctx.fillStyle=rgb(p.user.avatar?.skin,'#e8ad7d');ctx.fillRect(24,-101+lift,9,10);
      }
    }
    ctx.restore();
    const name=String(p.user.username||'Guest').slice(0,24);
    ctx.font='bold 12px system-ui';ctx.textAlign='center';
    const width=Math.min(180,ctx.measureText(name).width+18);
    ctx.fillStyle='#10192de8';ctx.fillRect(x-width/2,y-125,width,21);
    ctx.fillStyle='#fff';ctx.fillText(name,x,y-110);

  };
  window.pixelAvatarPreview=(g,avatar)=>{const sprite=makeSprite(avatar||{},'front',0);g.imageSmoothingEnabled=false;g.drawImage(sprite,10,6,100,140)};
  // Expose interpolated avatar feet for speech bubble placement.
  window.pixelAvatarPosition=id=>{const m=motion.get(id);return m?tile(m.x,m.y):null;};
  // Remove old interpolation entries after room transitions and disconnects.
  setInterval(()=>{if(typeof players==='undefined')return;for(const id of motion.keys())if(!players.has(id))motion.delete(id)},10000);
  console.info('[Pixel Haven] v5.2 customizable hotel avatars loaded');
})();
