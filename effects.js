// Chord Runner - Visual and audio polish
// Uses globals from script.js at call time: ctx, player, obstacles,
// GAME_WIDTH, GAME_HEIGHT, GROUND_Y, WORLD_SPEED, isInvulnerable.

// ================= SOUND EFFECTS =================
const soundToggle = document.getElementById("sound-toggle");
let sfxContext = null; // separate from the microphone's audioContext

function playTone(freq, duration, type = "sine", volume = 0.08, delay = 0) {
  const t0 = sfxContext.currentTime + delay;
  const osc = sfxContext.createOscillator();
  const gain = sfxContext.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain);
  gain.connect(sfxContext.destination);
  osc.start(t0);
  osc.stop(t0 + duration);
}

function playSound(name) {
  if (!soundToggle || !soundToggle.checked) return;
  if (!sfxContext) {
    sfxContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (sfxContext.state === "suspended") sfxContext.resume();

  switch (name) {
    case "perfect":
      playTone(880, 0.12, "sine");
      playTone(1320, 0.18, "sine", 0.08, 0.09);
      break;
    case "good":
      playTone(660, 0.15, "sine");
      break;
    case "combo":
      playTone(784, 0.1, "triangle");
      playTone(988, 0.1, "triangle", 0.08, 0.08);
      playTone(1175, 0.2, "triangle", 0.08, 0.16);
      break;
    case "wrong":
      playTone(160, 0.2, "sawtooth", 0.06);
      break;
    case "hit":
      playTone(110, 0.25, "square", 0.07);
      break;
    case "gameover":
      playTone(400, 0.25, "triangle");
      playTone(300, 0.25, "triangle", 0.08, 0.22);
      playTone(200, 0.45, "triangle", 0.08, 0.44);
      break;
  }
}

// ================= EFFECT STATE =================
let particles = [];
let popups = [];
let stars = null;
let shakeFrames = 0;
let bgOffset = 0;   // how far the world has scrolled (drives parallax)
let animFrame = 0;  // frame counter (drives running/twinkle animation)

function resetEffects() {
  particles = [];
  popups = [];
  shakeFrames = 0;
  bgOffset = 0;
  animFrame = 0;
  stars = Array.from({ length: 45 }, () => ({
    x: Math.random() * GAME_WIDTH,
    y: Math.random() * (GROUND_Y - 110),
    size: Math.random() < 0.2 ? 2 : 1,
    phase: Math.random() * Math.PI * 2
  }));
}

function spawnParticles(x, y, color, count = 14) {
  for (let i = 0; i < count; i++) {
    const life = 30 + Math.random() * 20;
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 6,
      vy: -Math.random() * 5 - 1,
      life, maxLife: life,
      size: 2 + Math.random() * 3,
      color
    });
  }
}

function spawnPopup(text, x, y, color = "#ffffff") {
  popups.push({ text, x, y, life: 55, maxLife: 55, color });
}

function triggerShake(frames = 12) {
  shakeFrames = frames;
}

// Restarts a CSS animation on an element (remove class, force reflow, re-add)
function retriggerAnimation(el, className) {
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
}

function updateEffects() {
  animFrame++;
  bgOffset += WORLD_SPEED;

  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.2;
    p.life--;
  }
  particles = particles.filter((p) => p.life > 0);

  for (const t of popups) {
    t.y -= 0.8;
    t.life--;
  }
  popups = popups.filter((t) => t.life > 0);

  if (shakeFrames > 0) shakeFrames--;
}

// ================= RENDERING =================
function renderBackground() {
  if (!stars) resetEffects();

  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, "#0b0b1f");
  sky.addColorStop(1, "#2a1b4d");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // Twinkling stars (barely move: they are far away)
  for (const s of stars) {
    const alpha = 0.5 + 0.5 * Math.sin(animFrame * 0.05 + s.phase);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    const sx = (s.x - bgOffset * 0.05 + GAME_WIDTH * 10) % GAME_WIDTH;
    ctx.fillRect(sx, s.y, s.size, s.size);
  }

  // Far mountains (parallax: 20% of world speed)
  ctx.fillStyle = "#1c1540";
  const tile = 220;
  const shift = (bgOffset * 0.2) % tile;
  for (let x = -tile - shift; x < GAME_WIDTH + tile; x += tile) {
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y);
    ctx.lineTo(x + tile * 0.5, GROUND_Y - 110);
    ctx.lineTo(x + tile, GROUND_Y);
    ctx.closePath();
    ctx.fill();
  }

  // Nearer hills (parallax: 50% of world speed)
  ctx.fillStyle = "#14312b";
  const tile2 = 140;
  const shift2 = (bgOffset * 0.5) % tile2;
  for (let x = -tile2 - shift2; x < GAME_WIDTH + tile2; x += tile2) {
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y);
    ctx.lineTo(x + tile2 * 0.5, GROUND_Y - 55);
    ctx.lineTo(x + tile2, GROUND_Y);
    ctx.closePath();
    ctx.fill();
  }
}

function renderGround() {
  ctx.fillStyle = "#0f3d2e";
  ctx.fillRect(0, GROUND_Y, GAME_WIDTH, GAME_HEIGHT - GROUND_Y);

  ctx.strokeStyle = "#1db954";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(GAME_WIDTH, GROUND_Y);
  ctx.stroke();

  // Scrolling dashes make the speed visible
  ctx.fillStyle = "#1b6b4d";
  const spacing = 70;
  const shift = bgOffset % spacing;
  for (let x = -shift; x < GAME_WIDTH; x += spacing) {
    ctx.fillRect(x, GROUND_Y + 22, 28, 3);
  }
}

function renderPlayer() {
  const { x, y, width: w, height: h } = player;
  const bodyColor = isInvulnerable ? "#ffffff" : "#ffcc00";
  const legH = 14;
  const bodyH = h - legH;

  // Legs: swing while running, tuck while airborne
  ctx.fillStyle = "#c79a00";
  if (player.isOnGround) {
    const swing = Math.sin(animFrame * 0.35) * 9;
    ctx.fillRect(x + 8 + swing, y + bodyH, 10, legH);
    ctx.fillRect(x + 22 - swing, y + bodyH, 10, legH);
  } else {
    ctx.fillRect(x + 8, y + bodyH, 10, 8);
    ctx.fillRect(x + 22, y + bodyH, 10, 8);
  }

  // Body
  ctx.fillStyle = bodyColor;
  ctx.fillRect(x, y, w, bodyH);

  // Little guitar on the body
  ctx.fillStyle = "#8b4513";
  ctx.beginPath();
  ctx.ellipse(x + 14, y + bodyH - 11, 9, 7, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a2d0c";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 18, y + bodyH - 15);
  ctx.lineTo(x + w + 4, y + bodyH - 28);
  ctx.stroke();

  // Eye
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(x + 26, y + 8, 6, 6);
}

function renderObstacles() {
  for (const o of obstacles) {
    const bottom = o.y + o.height;

    // Shadow under the rock
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.ellipse(o.x + o.width / 2, bottom, o.width * 0.55, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rock shape
    ctx.fillStyle = "#e94560";
    ctx.beginPath();
    ctx.moveTo(o.x, bottom);
    ctx.lineTo(o.x + o.width * 0.08, o.y + o.height * 0.45);
    ctx.lineTo(o.x + o.width * 0.35, o.y);
    ctx.lineTo(o.x + o.width * 0.72, o.y + o.height * 0.12);
    ctx.lineTo(o.x + o.width, o.y + o.height * 0.5);
    ctx.lineTo(o.x + o.width, bottom);
    ctx.closePath();
    ctx.fill();

    // Highlight edge
    ctx.strokeStyle = "#ff8fa3";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(o.x + o.width * 0.08, o.y + o.height * 0.45);
    ctx.lineTo(o.x + o.width * 0.35, o.y);
    ctx.lineTo(o.x + o.width * 0.72, o.y + o.height * 0.12);
    ctx.stroke();
  }
}

function renderEffects() {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(p.life / p.maxLife, 0);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  ctx.textAlign = "center";
  ctx.font = "bold 22px sans-serif";
  for (const t of popups) {
    ctx.globalAlpha = Math.max(t.life / t.maxLife, 0);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
}