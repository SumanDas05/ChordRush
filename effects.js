// Chord Runner - effects.js (commit 3: new character, rocks and concert background)
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
let floatingNotes = [];
let shakeFrames = 0;
let bgOffset = 0;   // how far the world has scrolled (drives parallax)
let animFrame = 0;  // frame counter (drives running and twinkle animation)

function resetEffects() {
  particles = [];
  popups = [];
  shakeFrames = 0;
  bgOffset = 0;
  animFrame = 0;

  stars = Array.from({ length: 70 }, () => ({
    x: Math.random() * GAME_WIDTH,
    y: Math.random() * GROUND_Y * 0.65,
    size: Math.random() < 0.2 ? 2.5 : 1.5,
    phase: Math.random() * Math.PI * 2
  }));

  floatingNotes = Array.from({ length: 9 }, () => ({
    x: Math.random() * GAME_WIDTH,
    y: GROUND_Y * 0.3 + Math.random() * GROUND_Y * 0.5,
    speed: 0.15 + Math.random() * 0.25,
    char: Math.random() < 0.5 ? "♪" : "♫",
    size: 24 + Math.random() * 26,
    phase: Math.random() * Math.PI * 2
  }));
}

function spawnParticles(x, y, color, count = 14) {
  for (let i = 0; i < count; i++) {
    const life = 30 + Math.random() * 20;
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 7,
      vy: -Math.random() * 6 - 1,
      life, maxLife: life,
      size: 3 + Math.random() * 4,
      color
    });
  }
}

function spawnPopup(text, x, y, color = "#ffffff") {
  popups.push({ text, x, y, life: 60, maxLife: 60, color });
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
    p.vy += 0.22;
    p.life--;
  }
  particles = particles.filter((p) => p.life > 0);

  for (const t of popups) {
    t.y -= 0.9;
    t.life--;
  }
  popups = popups.filter((t) => t.life > 0);

  for (const n of floatingNotes) {
    n.x -= WORLD_SPEED * 0.35 + n.speed;
    n.y += Math.sin(animFrame * 0.02 + n.phase) * 0.4;
    if (n.x < -60) {
      n.x = GAME_WIDTH + 60;
      n.y = GROUND_Y * 0.3 + Math.random() * GROUND_Y * 0.5;
    }
  }

  if (shakeFrames > 0) shakeFrames--;
}

// ================= HELPERS =================
function roundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// A smooth, scrolling hill silhouette made from layered sine waves
function drawHillLayer(color, baseHeight, amp1, amp2, speedFactor) {
  const shift = bgOffset * speedFactor;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  for (let x = 0; x <= GAME_WIDTH + 24; x += 24) {
    const wx = x + shift;
    const y = GROUND_Y - baseHeight - amp1 * Math.sin(wx * 0.004) - amp2 * Math.sin(wx * 0.011 + 1.3);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(GAME_WIDTH, GROUND_Y);
  ctx.closePath();
  ctx.fill();
}

// A soft stage spotlight beam
function drawBeam(x, angle, color) {
  ctx.save();
  ctx.translate(x, -10);
  ctx.rotate(angle);
  const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y * 1.1);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.lineTo(8, 0);
  ctx.lineTo(130, GROUND_Y * 1.1);
  ctx.lineTo(-130, GROUND_Y * 1.1);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ================= BACKGROUND =================
function renderBackground() {
  if (!stars) resetEffects();

  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, "#070716");
  sky.addColorStop(0.55, "#25124a");
  sky.addColorStop(1, "#7b2f6e");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // Stars
  for (const s of stars) {
    const alpha = 0.5 + 0.5 * Math.sin(animFrame * 0.05 + s.phase);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    const sx = (s.x - bgOffset * 0.04 + GAME_WIDTH * 10) % GAME_WIDTH;
    ctx.fillRect(sx, s.y, s.size, s.size);
  }

  // Moon with glow
  const mx = GAME_WIDTH * 0.8;
  const my = GROUND_Y * 0.24;
  const glow = ctx.createRadialGradient(mx, my, 10, mx, my, 150);
  glow.addColorStop(0, "rgba(255, 245, 200, 0.35)");
  glow.addColorStop(1, "rgba(255, 245, 200, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(mx - 160, my - 160, 320, 320);
  ctx.fillStyle = "#fff5cf";
  ctx.beginPath();
  ctx.arc(mx, my, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(220, 200, 150, 0.45)";
  ctx.beginPath(); ctx.arc(mx - 14, my - 8, 9, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(mx + 15, my + 14, 6, 0, Math.PI * 2); ctx.fill();

  // Concert spotlights
  drawBeam(GAME_WIDTH * 0.2, Math.sin(animFrame * 0.008) * 0.35, "rgba(120, 200, 255, 0.10)");
  drawBeam(GAME_WIDTH * 0.5, Math.sin(animFrame * 0.008 + 2) * 0.35, "rgba(255, 120, 200, 0.09)");
  drawBeam(GAME_WIDTH * 0.75, Math.sin(animFrame * 0.008 + 4) * 0.35, "rgba(255, 230, 120, 0.08)");

  // Floating music notes
  ctx.textAlign = "center";
  for (const n of floatingNotes) {
    ctx.font = `${n.size}px sans-serif`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
    ctx.fillText(n.char, n.x, n.y);
  }
  ctx.textAlign = "left";

  // Parallax hills (far = slow, near = fast)
  drawHillLayer("#1c1245", 90, 55, 25, 0.12);
  drawHillLayer("#2a1b5c", 55, 40, 18, 0.28);
  drawHillLayer("#10302a", 28, 28, 12, 0.5);
}

function renderGround() {
  const gh = GAME_HEIGHT - GROUND_Y;

  const g = ctx.createLinearGradient(0, GROUND_Y, 0, GAME_HEIGHT);
  g.addColorStop(0, "#17503a");
  g.addColorStop(1, "#08150f");
  ctx.fillStyle = g;
  ctx.fillRect(0, GROUND_Y, GAME_WIDTH, gh);

  // Glowing top edge
  ctx.save();
  ctx.shadowColor = "#2cff7a";
  ctx.shadowBlur = 14;
  ctx.strokeStyle = "#2cff7a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(GAME_WIDTH, GROUND_Y);
  ctx.stroke();
  ctx.restore();

  // Scrolling lane marks show the speed
  ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
  const spacing = 110;
  const shift = bgOffset % spacing;
  for (let x = -shift; x < GAME_WIDTH; x += spacing) {
    ctx.fillRect(x, GROUND_Y + gh * 0.45, 54, 4);
    ctx.fillRect(x + 40, GROUND_Y + gh * 0.75, 34, 3);
  }
}

// ================= CHARACTER =================
function drawLeg(hx, hy, len, angle) {
  const ex = hx + Math.sin(angle) * len;
  const ey = hy + Math.cos(angle) * len;
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.lineTo(ex, ey);
  ctx.stroke();

  ctx.fillStyle = "#f5f5f5"; // shoe
  ctx.beginPath();
  ctx.ellipse(ex + 6, ey, 11, 6, 0, 0, Math.PI * 2);
  ctx.fill();
}

function renderPlayer() {
  const { x, y, width: w, height: h } = player;
  const airborne = !player.isOnGround;
  const t = animFrame * 0.28;
  const cx = x + w / 2;
  const hipY = y + h * 0.64;
  const legLen = h * 0.36;
  const bob = airborne ? 0 : Math.abs(Math.sin(t)) * 3;

  // Ground shadow (shrinks while jumping)
  const lift = Math.max(0, GROUND_Y - (y + h));
  const shScale = Math.max(0.3, 1 - lift / 300);
  ctx.fillStyle = `rgba(0, 0, 0, ${0.35 * shScale})`;
  ctx.beginPath();
  ctx.ellipse(cx, GROUND_Y + 5, w * 0.6 * shScale, 8 * shScale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  if (isInvulnerable) {
    ctx.shadowColor = "#7cf7ff"; // cyan glow while the jump is in progress
    ctx.shadowBlur = 26;
  }

  // Legs: swing while running, tuck in the air
  ctx.lineCap = "round";
  ctx.lineWidth = 13;
  ctx.strokeStyle = "#2b2f77";
  drawLeg(cx - 8, hipY, legLen, airborne ? 0.8 : Math.sin(t) * 0.75);
  drawLeg(cx + 8, hipY, legLen, airborne ? -0.35 : -Math.sin(t) * 0.75);

  // Upper body bobs while running
  ctx.translate(0, -bob);

  // Torso
  ctx.fillStyle = "#1db954";
  roundedRect(x + 14, y + 34, w - 28, 38, 10);
  ctx.fill();
  ctx.fillStyle = "#14833b";
  ctx.fillRect(x + 14, y + 64, w - 28, 6);

  // Guitar
  ctx.save();
  ctx.translate(cx + 2, y + 58);
  ctx.rotate(-0.4);
  ctx.fillStyle = "#c4762b";
  ctx.beginPath(); ctx.ellipse(-4, 4, 19, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(14, -2, 12, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#2a1608";
  ctx.beginPath(); ctx.arc(2, 2, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#5a3a1e";
  ctx.fillRect(22, -4, 32, 7);
  ctx.fillStyle = "#3a2412";
  ctx.fillRect(52, -6, 12, 11);
  ctx.restore();

  // Arms: strumming hand moves, fretting hand holds the neck
  const shoulderY = y + 42;
  ctx.strokeStyle = "#f2c29b";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(cx + 4, shoulderY);
  ctx.lineTo(cx + 8 + Math.sin(t * 2) * 6, y + 62 + Math.cos(t * 2) * 7);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 4, shoulderY);
  ctx.lineTo(cx + 26, y + 46);
  ctx.stroke();

  // Head
  const hx = cx + 3;
  const hy = y + 20;
  ctx.fillStyle = "#2d1b12";
  ctx.beginPath(); ctx.ellipse(hx - 15, hy + 2, 8, 13, 0.3, 0, Math.PI * 2); ctx.fill();   // long hair
  ctx.fillStyle = "#f2c29b";
  ctx.beginPath(); ctx.arc(hx, hy, 17, 0, Math.PI * 2); ctx.fill();                        // face
  ctx.fillStyle = "#2d1b12";
  ctx.beginPath(); ctx.arc(hx, hy - 2, 18, Math.PI * 1.02, Math.PI * 1.98); ctx.fill();    // hair cap
  ctx.beginPath(); ctx.ellipse(hx + 6, hy - 16, 14, 7, 0.25, 0, Math.PI * 2); ctx.fill();  // quiff
  ctx.fillStyle = "#101018";
  roundedRect(hx - 4, hy - 5, 24, 9, 4);
  ctx.fill();                                                                               // sunglasses
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.fillRect(hx + 2, hy - 3, 5, 2);
  ctx.strokeStyle = "#8a4b2a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(hx + 8, hy + 6, 5, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();                                                                             // smile

  ctx.restore();
}

// ================= OBSTACLES (rocks) =================
const ROCK_POINTS = [[0, 1], [0.04, 0.6], [0.22, 0.2], [0.5, 0], [0.78, 0.16], [0.98, 0.55], [1, 1]];

function renderObstacles() {
  for (const o of obstacles) {
    const bottom = o.y + o.height;

    // Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
    ctx.beginPath();
    ctx.ellipse(o.x + o.width / 2, bottom + 2, o.width * 0.6, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Outline points (each rock has its own random jitter)
    const pts = ROCK_POINTS.map(([px, py], i) => {
      const jitter = o.jitter ? o.jitter[i] : 1;
      const yy = (i === 0 || i === ROCK_POINTS.length - 1) ? bottom : o.y + py * o.height * jitter;
      return [o.x + px * o.width, yy];
    });

    const grad = ctx.createLinearGradient(o.x, o.y, o.x + o.width, bottom);
    grad.addColorStop(0, "#ff6b81");
    grad.addColorStop(1, "#a81f3b");
    ctx.fillStyle = grad;
    ctx.strokeStyle = "#6e1126";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Facet lines for depth
    ctx.strokeStyle = "rgba(0, 0, 0, 0.22)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pts[3][0], pts[3][1]);
    ctx.lineTo(o.x + o.width * 0.45, bottom);
    ctx.moveTo(pts[2][0], pts[2][1]);
    ctx.lineTo(o.x + o.width * 0.25, o.y + o.height * 0.7);
    ctx.stroke();

    // Light edge
    ctx.strokeStyle = "rgba(255, 190, 200, 0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pts[1][0], pts[1][1]);
    ctx.lineTo(pts[2][0], pts[2][1]);
    ctx.lineTo(pts[3][0], pts[3][1]);
    ctx.stroke();
  }
}

// ================= PARTICLES AND POPUPS =================
function renderEffects() {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(p.life / p.maxLife, 0);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  ctx.textAlign = "center";
  ctx.font = "bold 34px sans-serif";
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(0, 0, 0, 0.7)";
  ctx.lineJoin = "round";
  for (const t of popups) {
    ctx.globalAlpha = Math.max(t.life / t.maxLife, 0);
    ctx.strokeText(t.text, t.x, t.y);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
}