// Night forest scene with red moon, howling wolf, clouds, rain and lightning
(function(){
  const canvas = document.getElementById('scene');
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0, DPR = window.devicePixelRatio || 1;

  function resize(){
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    ctx.setTransform(DPR,0,0,DPR,0,0);
  }
  window.addEventListener('resize', resize, {passive:true});
  resize();

  // UI elements for audio
  const enableSoundBtn = document.getElementById('enableSound');
  const howlBtn = document.getElementById('howlBtn');
  const volSlider = document.getElementById('volSlider');
  const thunderToggle = document.getElementById('thunderToggle');
  const thunderVol = document.getElementById('thunderVol');

  // WebAudio setup (created on first user gesture)
  let audioCtx = null;
  let masterGain = null;

  function initAudio(){
    if(audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = parseFloat(volSlider.value || 0.6);
    masterGain.connect(audioCtx.destination);
    // update slider to control gain
    volSlider.addEventListener('input', ()=>{ if(masterGain) masterGain.gain.value = parseFloat(volSlider.value); });

    // thunder gain (separate so thunder volume can be controlled and toggled)
    thunderGain = audioCtx.createGain();
    thunderGain.gain.value = parseFloat(thunderVol.value || 0.6);
    thunderGain.connect(masterGain);
    thunderVol.addEventListener('input', ()=>{ if(thunderGain) thunderGain.gain.value = parseFloat(thunderVol.value); });
    thunderToggle.addEventListener('change', ()=>{ /* toggled; actual play checks this flag */ });
    enableSoundBtn.textContent = 'Sound Enabled';
  }

  // Simple synthesized wolf-like howl using oscillator + filtered noise
  function playHowl(){
    if(!audioCtx) initAudio();
    if(!audioCtx) return;

    const now = audioCtx.currentTime;
    const howlGain = audioCtx.createGain();
    howlGain.gain.setValueAtTime(0.0, now);
    howlGain.gain.linearRampToValueAtTime(0.9, now + 0.6);
    howlGain.gain.exponentialRampToValueAtTime(0.0001, now + 4.0);
    howlGain.connect(masterGain);

    // Oscillator for tonal part
    const osc = audioCtx.createOscillator();
    osc.type = 'sawtooth';
    // sweeping frequency to simulate a howl
    const startFreq = 180 + Math.random()*40;
    const endFreq = 480 + Math.random()*120;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 3.2);

    // Lowpass filter to make it vocal
    const filt = audioCtx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(1200, now);
    filt.frequency.exponentialRampToValueAtTime(500, now + 3.2);

    osc.connect(filt);

    // Noise burst for breathiness
    const bufferSize = audioCtx.sampleRate * 2;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for(let i=0;i<bufferSize;i++) data[i] = (Math.random()*2 - 1) * Math.exp(-i / (audioCtx.sampleRate * 1.6));
    const nb = audioCtx.createBufferSource();
    nb.buffer = noiseBuffer;
    const noiseFilt = audioCtx.createBiquadFilter();
    noiseFilt.type = 'bandpass';
    noiseFilt.frequency.setValueAtTime(900, now);
    noiseFilt.Q.setValueAtTime(0.8, now);
    nb.connect(noiseFilt);
    noiseFilt.connect(howlGain);

    // connect oscillator through a gain to the howlGain
    filt.connect(howlGain);

    // start
    osc.start(now);
    nb.start(now);

    // stop
    osc.stop(now + 4.2);
    nb.stop(now + 4.2);
    setTimeout(()=>{ try{ howlGain.disconnect(); }catch(e){} }, 5200);
  }

  // Very simple thunder/rumble synthesis: long filtered noise with a low-frequency sweep
  function playThunder(delaySeconds = 0){
    if(!audioCtx) initAudio();
    if(!audioCtx || !thunderGain) return;
    if(!thunderToggle.checked) return; // user disabled thunder

    const start = audioCtx.currentTime + Math.max(0, delaySeconds);
    const len = 3.5 + Math.random()*2.0; // seconds

    const bufferSize = Math.floor(audioCtx.sampleRate * len);
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    // make decaying noise with some low-frequency emphasis
    for(let i=0;i<bufferSize;i++){
      const env = Math.exp(-i / (audioCtx.sampleRate * (1.7 + Math.random()*1.2)));
      data[i] = (Math.random()*2 - 1) * env * (0.6 + Math.random()*0.6);
    }

    const src = audioCtx.createBufferSource();
    src.buffer = noiseBuffer;
    // a lowpass to give thunder its bassy character
    const lp = audioCtx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1200, start);
    // sweep down to deepen the boom
    lp.frequency.exponentialRampToValueAtTime(60 + Math.random()*40, start + len*0.9);

    // optional slight highband to create crack
    const hp = audioCtx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(20, start);

    // gain envelope for thunder
    const tg = audioCtx.createGain();
    tg.gain.setValueAtTime(0.0001, start);
    tg.gain.exponentialRampToValueAtTime(0.8 + Math.random()*0.6, start + 0.08);
    tg.gain.exponentialRampToValueAtTime(0.0001, start + len);

    src.connect(lp);
    lp.connect(hp);
    hp.connect(tg);
    tg.connect(thunderGain);

    src.start(start);
    src.stop(start + len + 0.1);
    // cleanup
    setTimeout(()=>{ try{ src.disconnect(); lp.disconnect(); hp.disconnect(); tg.disconnect(); }catch(e){} }, (len+1)*1000);
  }

  enableSoundBtn.addEventListener('click', ()=>{
    try{ initAudio(); if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); }catch(e){ console.warn(e); }
  });
  howlBtn.addEventListener('click', ()=>{ if(!audioCtx) initAudio(); playHowl(); });

  // Scene parameters
  const clouds = [];
  const trees = [];
  const drops = [];

  // Populate clouds
  for(let i=0;i<8;i++){
    clouds.push({
      x: Math.random()*W*1.5 - W*0.25,
      y: Math.random()*H*0.5,
      scale: 0.8 + Math.random()*1.4,
      speed: 0.2 + Math.random()*0.6,
      alpha: 0.18 + Math.random()*0.25
    });
  }

  // Forest silhouette layers
  function makeTrees(){
    trees.length = 0;
    const layers = 3;
    for(let l=0;l<layers;l++){
      const count = 10 + Math.floor(10 * (1 - l/layers));
      for(let i=0;i<count;i++){
        const x = (i/count) * (W + 200) - 100 + Math.random()*80;
        const base = H - (60 + l*40)
        const h = 60 + Math.random()*160 - l*20;
        trees.push({x, base, h, layer:l});
      }
    }
  }
  makeTrees();

  // Rain drops
  for(let i=0;i<200;i++){
    drops.push({x:Math.random()*W, y:Math.random()*H, l:8+Math.random()*18, s:4+Math.random()*12});
  }

  // Wolf properties (improved for 3D look)
  const wolf = {
    x: W*0.72,
    y: H - 120,
    scale: 1.8,
    headAngle: 0,
    headDir: 0.02,
    rotX: 0,
    rotY: 0
  };

  // track mouse to give the wolf slight 3D rotation
  window.addEventListener('mousemove', (ev)=>{
    const nx = (ev.clientX / W - 0.5) * 2; // -1..1
    const ny = (ev.clientY / H - 0.5) * 2;
    wolf.rotY = nx * 0.25;
    wolf.rotX = ny * 0.12;
  }, {passive:true});

  // update wolf position/scale on resize
  function updateWolfOnResize(){
    wolf.x = W*0.72;
    wolf.y = H - 120;
  }

  // Lightning control
  let lightningTimer = 0;
  let flash = 0;

  function drawSky(){
    const g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#04030a');
    g.addColorStop(0.4,'#0a0b18');
    g.addColorStop(1,'#05060a');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,W,H);
  }

  function drawRedMoon(time){
    const mx = W*0.25;
    const my = H*0.22;
    const r = Math.min(W,H)*0.12;
    // glow
    const gg = ctx.createRadialGradient(mx,my,r*0.2,mx,my,r*1.8);
    gg.addColorStop(0,'rgba(200,30,30,0.18)');
    gg.addColorStop(0.35,'rgba(170,20,20,0.12)');
    gg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = gg;
    ctx.beginPath(); ctx.arc(mx,my,r*1.5,0,Math.PI*2); ctx.fill();

    // moon body
    const mg = ctx.createRadialGradient(mx - r*0.15, my - r*0.15, r*0.05, mx,my,r);
    mg.addColorStop(0,'#ff6666');
    mg.addColorStop(0.5,'#cc2323');
    mg.addColorStop(1,'#7a1212');
    ctx.fillStyle = mg;
    ctx.beginPath(); ctx.arc(mx,my,r,0,Math.PI*2); ctx.fill();

    // subtle craters
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    for(let i=0;i<6;i++){
      const a = (i/6)*Math.PI*2 + Math.sin(time*0.0005 + i)*0.2;
      const rr = r*0.12*(0.8 + (i%3)*0.6);
      ctx.beginPath(); ctx.arc(mx + Math.cos(a)*r*0.4, my + Math.sin(a)*r*0.25, rr, 0, Math.PI*2); ctx.fill();
    }
  }

  function drawClouds(dt){
    for(const c of clouds){
      c.x += c.speed * dt * 0.02;
      if(c.x > W + 200) c.x = -200 - Math.random()*100;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.scale(c.scale, c.scale);
      ctx.fillStyle = `rgba(30,30,36,${c.alpha + 0.02*Math.sin(c.x*0.01)})`;
      ctx.beginPath();
      drawCloudShape(ctx, 0, 0, 220, 60);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawCloudShape(cctx, x, y, w, h){
    cctx.moveTo(x - w/2, y);
    for(let i=-2;i<=2;i++){
      const cx = x + (i/2)*w/2;
      const cy = y + (Math.sin(i)*10);
      cctx.ellipse(cx, cy, w/5, h/2.2, 0, 0, Math.PI*2);
    }
  }

  function drawForest(){
    for(const t of trees){
      ctx.fillStyle = `rgba(6,10,8,${0.9 - t.layer*0.15})`;
      const wob = Math.sin((Date.now()*0.0003) + t.x*0.01) * (4 - t.layer*2);
      ctx.beginPath();
      ctx.moveTo(t.x - 20, t.base);
      ctx.lineTo(t.x + 20, t.base);
      ctx.lineTo(t.x + 20, t.base - t.h + wob);
      ctx.lineTo(t.x, t.base - t.h - 14 + wob);
      ctx.lineTo(t.x - 20, t.base - t.h + wob);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#020202';
    ctx.fillRect(0, H - 80, W, 80);
  }

  // Improved 3D-ish wolf drawing: layered shapes with gradient shading and simple rotation
  function drawWolf(t){
    const x = wolf.x;
    const y = wolf.y;
    const s = 1.0 * wolf.scale;

    // slight breathing/head bob
    wolf.headAngle += wolf.headDir * (Math.sin(t*0.002)*0.5 + 0.5);
    if(wolf.headAngle > 1.2 || wolf.headAngle < -0.6) wolf.headDir *= -1;

    // face the moon: compute direction to moon center
    const mx = W*0.25;
    const my = H*0.22;
    const dx = mx - x;
    const dy = my - y;
    const angleToMoon = Math.atan2(dy, dx);

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);

    // rotate body toward moon but limit rotation range so it stays natural
    const bodyRotate = Math.max(-1.2, Math.min(1.2, angleToMoon * 0.9));
    ctx.rotate(bodyRotate);

    // subtle tilt from mouse
    ctx.rotate(wolf.rotY * 0.04);

    // hill
    ctx.fillStyle = '#020202';
    ctx.beginPath();
    ctx.ellipse(-10, 26, 160, 36, 0, Math.PI, 0);
    ctx.fill();

    // body layers for volume
    const bodyX = 0; const bodyY = -10;
    const layers = 5;
    for(let i=0;i<layers;i++){
      const depth = i/(layers-1);
      const bw = 60 + depth*48;
      const bh = 26 + depth*16;
      const ox = -depth*10;
      const oy = -depth*4;
      const g = ctx.createLinearGradient(bodyX - bw, bodyY - bh, bodyX + bw, bodyY + bh);
      g.addColorStop(0, `rgba(${18 + depth*16},${18 + depth*16},${18 + depth*16},1)`);
      g.addColorStop(1, `rgba(${8 + depth*8},${8 + depth*8},${8 + depth*8},1)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(bodyX + ox, bodyY + oy, bw, bh, wolf.rotX*0.08 - 0.12, 0, Math.PI*2); ctx.fill();
    }

    // legs (darker)
    ctx.fillStyle = '#030303';
    ctx.beginPath(); ctx.rect(-28, 8, 12, 26); ctx.rect(10, 8, 12, 26); ctx.fill();

    // tail - layered and larger
    for(let i=0;i<4;i++){
      ctx.fillStyle = `rgba(6,6,6,${1 - i*0.16})`;
      ctx.beginPath(); ctx.moveTo(-44 - i*6,-14 + i*3); ctx.quadraticCurveTo(-92 - i*10,-8 - i*6,-84 - i*6,-2 + i*4); ctx.quadraticCurveTo(-80 - i*6,2 + i*4,-60 - i*6,-6 + i*2); ctx.fill();
    }

    // neck/head group; head should look toward moon more strongly
    ctx.save();
    ctx.translate(48, -26);
    const headRotate = -0.6 + (wolf.headAngle*0.7) + (angleToMoon*0.15);
    ctx.rotate(headRotate + wolf.rotX*0.18);

    // head - improved shape
    const headG = ctx.createRadialGradient(10, -6, 6, 18, -8, 40);
    headG.addColorStop(0, '#3a3a3a');
    headG.addColorStop(1, '#0b0b0b');
    ctx.fillStyle = headG;
    ctx.beginPath(); ctx.ellipse(14, -10, 26, 14, 0, 0, Math.PI*2); ctx.fill();

    // ear front
    ctx.beginPath(); ctx.moveTo(4,-18); ctx.lineTo(0,-36); ctx.lineTo(18,-28); ctx.closePath(); ctx.fillStyle='#111'; ctx.fill();
    // ear inner highlight
    ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.beginPath(); ctx.moveTo(6,-22); ctx.quadraticCurveTo(2,-28,10,-30); ctx.fill();

    // snout
    ctx.fillStyle = '#060606';
    ctx.beginPath(); ctx.moveTo(32,-10); ctx.quadraticCurveTo(38,-8,42,-6); ctx.quadraticCurveTo(46,-4,42,-0); ctx.lineTo(32,-0); ctx.fill();

    // mouth opening (howl) - bigger and animated
    const howlOpen = 12 + Math.abs(Math.sin(t*0.01))*12 + Math.max(0, wolf.headAngle*10);
    ctx.fillStyle = '#010101';
    ctx.beginPath(); ctx.moveTo(38,-6); ctx.lineTo(44,-18 - howlOpen); ctx.lineTo(48,-6); ctx.closePath(); ctx.fill();

    ctx.restore();

    ctx.restore();
  }

  function drawRain(dt){
    ctx.strokeStyle = 'rgba(180,180,200,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(const d of drops){
      d.x += d.s * dt * 0.02;
      d.y += d.s * dt * 0.04;
      if(d.x > W) d.x = Math.random()*50;
      if(d.y > H) { d.y = -10; d.x = Math.random()*W; }
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - d.s*0.3, d.y + d.l);
    }
    ctx.stroke();
  }

  function drawLightning(){
    if(lightningTimer <= 0){
      lightningTimer = 5000 + Math.random()*8000;
    }
    if(Math.random() < 0.001){
      lightningTimer = 0;
    }
    if(lightningTimer <= 60 && Math.random() < 0.02){
      flash = 1.0;
      const gx = Math.random()*(W*0.8) + W*0.1;
      const segments = 7 + Math.floor(Math.random()*5);
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.92)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      let sx = gx;
      let sy = 0;
      ctx.moveTo(sx, sy);
      for(let i=0;i<segments;i++){
        sx += (Math.random()-0.5)*60;
        sy += H/segments * (0.7 + Math.random()*0.6);
        ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  let last = performance.now();
  function loop(now){
    const dt = now - last;
    last = now;

    lightningTimer -= dt;
    if(lightningTimer < -800) lightningTimer = 0;

    drawSky();
    drawRedMoon(now);
    drawClouds(dt);

    if(lightningTimer < 200 && Math.random() < 0.01) flash = 1.0;
    if(flash > 0){
      ctx.fillStyle = `rgba(255,255,255,${Math.min(flash,0.6)})`;
      ctx.fillRect(0,0,W,H);
      flash *= 0.9;
    }

    drawForest();
    drawWolf(now);
    drawRain(dt);
    drawLightning();

    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', ()=>{ makeTrees(); resize(); updateWolfOnResize(); }, {passive:true});

  // ensure audio init on first gesture (some browsers block AudioContext start)
  function ensureAudioOnUserGesture(){
    function one(){ try{ initAudio(); if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); }catch(e){};
      window.removeEventListener('click', one);
      window.removeEventListener('keydown', one);
    }
    window.addEventListener('click', one);
    window.addEventListener('keydown', one);
  }
  ensureAudioOnUserGesture();

  requestAnimationFrame(loop);

})();
