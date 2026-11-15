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
    const back=dir==='back', side=dir==='left'||dir==='right', flip=dir==='left';
    g.save();if(flip){g.translate(34,0);g.scale(-1,1)}
    const swing=frame===1?2:frame===3?-2:0;
    // Animated trousers and shoes
    block(10,38+swing,6,10,palette.outline);block(11,38+swing,4,9,palette.jeans);
    block(19,38-swing,6,10,palette.outline);block(20,38-swing,4,9,palette.jeans);
    block(9,47+swing,8,4,palette.shoes);block(19,47-swing,8,4,palette.shoes);
    block(10,48+swing,5,1,'#e5e5ed');block(20,48-swing,5,1,'#e5e5ed');
    // Jacket, collar and arms
    block(8,23,19,18,palette.outline);block(9,24,17,16,shirt);
    block(9,24,3,15,tint(shirt,-30));block(22,24,3,15,tint(shirt,-24));
    block(5,26+(frame%2),5,13,palette.outline);block(6,27+(frame%2),3,10,shirt);
    block(26,26-(frame%2),5,13,palette.outline);block(27,27-(frame%2),3,10,shirt);
    block(6,36+(frame%2),3,3,skin);block(27,36-(frame%2),3,3,skin);
    if(!back){block(16,25,2,13,tint(shirt,55));block(15,24,4,3,'#f3eee4')}
    // Neck and head
    block(14,20,8,6,palette.outline);block(15,20,6,5,skin);
    block(side?11:9,6,side?16:18,18,palette.outline);
    block(side?12:10,7,side?14:16,16,skin);
    block(side?13:11,18,side?12:14,4,tint(skin,-16));
    // Hair silhouette with individual pixel tufts
    block(9,4,19,9,palette.outline);block(10,3,17,8,hair);
    block(12,2,12,3,tint(hair,20));block(8,8,5,8,hair);
    block(24,7,4,8,hair);block(11,5,6,2,tint(hair,33));
    if(back){block(11,12,15,9,hair);block(13,20,11,2,tint(hair,-20))}
    else if(side){block(21,14,2,2,palette.eye);block(24,19,2,1,palette.mouth)}
    else {block(13,15,2,2,palette.eye);block(22,15,2,2,palette.eye);block(17,20,4,1,palette.mouth)}
    g.restore();
    atlas.set(key,c);if(atlas.size>512)atlas.clear();
    return c;
  }
  function direction(dx,dy,old='front') {
    if(Math.abs(dx)+Math.abs(dy)<.01)return old;
    if(Math.abs(dx)>Math.abs(dy))return dx>0?'right':'left';
    return dy>0?'front':'back';
  }
  const original=window.drawAvatar;
  window.drawAvatar=function(p) {
    if(!p||!p.user)return original(p);
    const id=p.socketId||p.user.id||p.user.username;
    let m=motion.get(id);
    if(!m){m={x:p.x,y:p.y,dir:'front',last:performance.now()};motion.set(id,m)}
    const now=performance.now(),dt=Math.min((now-m.last)/1000,.06);m.last=now;
    const dx=p.x-m.x,dy=p.y-m.y,dist=Math.hypot(dx,dy);
    if(dist>.001){m.dir=direction(dx,dy,m.dir);const step=Math.min(dist,dt*4.3);m.x+=dx/dist*step;m.y+=dy/dist*step}
    const walking=dist>.045;
    const frame=walking?Math.floor(now/135)%4:0;
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
    const bubble=chatBubbles.get(p.socketId);
    if(bubble&&bubble.until>Date.now()){
      const message=String(bubble.text||'').replace(/\\s+/g,' ').trim();
      if(message){
        ctx.save();
        ctx.font='13px system-ui';ctx.textAlign='center';
        const maxWidth=190,words=message.split(' '),lines=[];let current='';
        for(const word of words){
          const candidate=current?current+' '+word:word;
          if(ctx.measureText(candidate).width>maxWidth&&current){lines.push(current);current=word;}
          else current=candidate;
        }
        if(current)lines.push(current);
        // Wrap long unbroken strings safely.
        const wrapped=[];
        for(const line of lines){
          let part='';
          for(const ch of line){if(ctx.measureText(part+ch).width>maxWidth&&part){wrapped.push(part);part='';}part+=ch;}
          if(part)wrapped.push(part);
        }
        const visible=wrapped.slice(0,5),width=Math.min(220,Math.max(58,...visible.map(t=>ctx.measureText(t).width+22)));
        const height=visible.length*17+16,top=y-144-height;
        ctx.fillStyle='#f9f8f4';ctx.strokeStyle='#4b3b52';ctx.lineWidth=2;
        ctx.beginPath();ctx.roundRect(x-width/2,top,width,height,8);ctx.fill();ctx.stroke();
        ctx.beginPath();ctx.moveTo(x-7,top+height);ctx.lineTo(x,top+height+9);ctx.lineTo(x+7,top+height);ctx.fill();ctx.stroke();
        ctx.fillStyle='#25273d';
        visible.forEach((t,i)=>ctx.fillText(t,x,top+19+i*17));
        ctx.restore();
      }
    }
  };
  // Remove old interpolation entries after room transitions and disconnects.
  setInterval(()=>{if(typeof players==='undefined')return;for(const id of motion.keys())if(!players.has(id))motion.delete(id)},10000);
  console.info('[Pixel Haven] v4 directional avatar sprite atlas loaded');
})();
