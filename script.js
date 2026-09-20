// Chord Runner - Fix: Guaranteed-clear jump mechanism

// ---- Screen elements ----
const startScreen = document.getElementById("start-screen");
const gameScreen = document.getElementById("game-screen");
const startBtn = document.getElementById("start-btn");
const gameoverScreen = document.getElementById("gameover-screen");
const restartBtn = document.getElementById("restart-btn");

// ---- HUD elements ----
const scoreEl = document.getElementById("score");
const comboEl = document.getElementById("combo");
const livesEl = document.getElementById("lives");
const finalScoreEl = document.getElementById("final-score");
const finalHighscoreEl = document.getElementById("final-highscore");

// ---- Chord panel elements ----
const chordNameEl = document.getElementById("chord-name");
const chordFeedbackEl = document.getElementById("chord-feedback");

// ---- Debug mode toggle ----
const debugModeToggle = document.getElementById("debug-mode-toggle");

// ---- Canvas setup ----
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

const GAME_WIDTH = canvas.width;
const GAME_HEIGHT = canvas.height;
const GROUND_Y = GAME_HEIGHT - 50;

// ---- Game state ----
let gameState = "start"; // "start" | "playing" | "paused" | "gameover"

// ---- Physics constants ----
const GRAVITY = 0.55;
const JUMP_FORCE = -12;
const WORLD_SPEED = 1.4;      // slower still — was 2.2
const STARTING_LIVES = 3;

// ---- Timing windows (used only for SCORING - based on distance when you strum) ----
const PERFECT_DISTANCE = 220; // widened so PERFECT is easier to land at this slower pace
const GOOD_DISTANCE = 500;

// ---- NEW: Jump queue system ----
// Instead of jumping the instant a chord is confirmed correct, we "queue" the
// jump. The game then fires the real jump automatically once the nearest
// obstacle reaches a safe, pre-tuned distance - guaranteeing it's cleared,
// regardless of exactly when you strummed.
let jumpQueued = false;
const JUMP_TRIGGER_DISTANCE = 95; // scaled down to match the slower WORLD_SPEED, so the jump still fires with the same real-world timing margin
// Extra safety net: brief invulnerability during the jump arc, so even if
// obstacle sizing/speed changes later (Step 15 difficulty levels), a queued
// jump can never result in an unfair hit.
let isInvulnerable = false;
const INVULNERABILITY_DURATION_MS = 900;

// ---- Score / lives / combo ----
let score = 0;
let combo = 0;
let lives = STARTING_LIVES;
let highScore = Number(localStorage.getItem("chordRunnerHighScore")) || 0;

// ---- Current chord (from chords.js) ----
let currentChord = null;

function setNewChord() {
  currentChord = pickRandomChord();
  chordNameEl.textContent = currentChord.name.toUpperCase();
  drawChordDiagram(currentChord);
  chordFeedbackEl.textContent = "";
  chordFeedbackEl.className = "";
}

// ---- Player object ----
const player = {
  x: 100,
  y: GROUND_Y - 50,
  width: 40,
  height: 50,
  velocityY: 0,
  isOnGround: true
};

function resetPlayer() {
  player.y = GROUND_Y - player.height;
  player.velocityY = 0;
  player.isOnGround = true;
}

function updatePlayer() {
  player.velocityY += GRAVITY;
  player.y += player.velocityY;

  const groundLevel = GROUND_Y - player.height;
  if (player.y >= groundLevel) {
    player.y = groundLevel;
    player.velocityY = 0;
    player.isOnGround = true;
  } else {
    player.isOnGround = false;
  }
}

function jump() {
  if (player.isOnGround) {
    player.velocityY = JUMP_FORCE;
    player.isOnGround = false;
  }
}

// ---- Obstacles ----
let obstacles = [];
let framesSinceLastSpawn = 0;
let framesUntilNextSpawn = randomSpawnGap();

function randomSpawnGap() {
  // Roughly 4.5-6.5 seconds between obstacles at 60fps — plenty of time
  // to find your chord shape, strum, and reset before the next one.
  return Math.floor(Math.random() * 120) + 270;
}

function spawnObstacle() {
  const size = 30 + Math.random() * 20;
  obstacles.push({
    x: GAME_WIDTH + size,
    y: GROUND_Y - size,
    width: size,
    height: size,
    passed: false
  });
}

function updateObstacles() {
  framesSinceLastSpawn++;
  if (framesSinceLastSpawn >= framesUntilNextSpawn) {
    spawnObstacle();
    framesSinceLastSpawn = 0;
    framesUntilNextSpawn = randomSpawnGap();
  }

  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obstacle = obstacles[i];
    obstacle.x -= WORLD_SPEED;

    if (!obstacle.passed && obstacle.x + obstacle.width < player.x) {
      obstacle.passed = true;
    }

    if (obstacle.x + obstacle.width < 0) {
      obstacles.splice(i, 1);
    }
  }
}

// ---- Finds the nearest obstacle still approaching the player (not yet passed) ----
function getNearestUpcomingObstacle() {
  let nearest = null;
  let nearestDistance = Infinity;

  for (const obstacle of obstacles) {
    if (obstacle.passed) continue;
    const distance = obstacle.x - player.x;
    if (distance >= 0 && distance < nearestDistance) {
      nearestDistance = distance;
      nearest = obstacle;
    }
  }

  return { obstacle: nearest, distance: nearestDistance };
}

// ---- NEW: Jump queue processing ----
// Called every frame. If a jump is queued, fire it the moment the nearest
// obstacle reaches the safe trigger distance (or immediately if there's
// nothing to time against, or it's already closer than that distance).
function updateJumpQueue() {
  if (!jumpQueued) return;

  const { obstacle, distance } = getNearestUpcomingObstacle();

  if (!obstacle || distance <= JUMP_TRIGGER_DISTANCE) {
    executeQueuedJump();
  }
}

function executeQueuedJump() {
  jumpQueued = false;
  jump();

  // Safety net: ignore collisions for the duration of this jump arc
  isInvulnerable = true;
  setTimeout(() => {
    isInvulnerable = false;
  }, INVULNERABILITY_DURATION_MS);
}

// ---- Chord attempt handling ----
// Called either by Debug Mode (Spacebar) or by real guitar detection (audio.js).
function handleChordAttempt(isCorrect) {
  if (!isCorrect) {
    chordFeedbackEl.textContent = `${currentChord.name} ✗ WRONG CHORD`;
    chordFeedbackEl.className = "wrong";
    return;
  }

  // Score based on how close the obstacle was WHEN YOU STRUMMED
  // (this still rewards good timing/awareness, even though the actual
  // jump is deferred to a guaranteed-safe moment).
  const { distance } = getNearestUpcomingObstacle();

  let timingLabel, points, feedbackClass;

  if (distance === Infinity) {
    timingLabel = "EARLY";
    points = 10;
    feedbackClass = "good";
  } else if (distance <= PERFECT_DISTANCE) {
    timingLabel = "PERFECT!";
    points = 100;
    feedbackClass = "perfect";
  } else if (distance <= GOOD_DISTANCE) {
    timingLabel = "GOOD";
    points = 50;
    feedbackClass = "good";
  } else {
    timingLabel = "EARLY";
    points = 10;
    feedbackClass = "good";
  }

  addScore(points);
  chordFeedbackEl.textContent = `${currentChord.name} ✓ ${timingLabel}`;
  chordFeedbackEl.className = feedbackClass;

  // Queue the jump instead of firing it immediately - it will execute
  // automatically once the obstacle reaches a safe, guaranteed-clear distance.
  jumpQueued = true;

  setTimeout(() => {
    if (gameState === "playing") setNewChord();
  }, 400);
}

// ---- Function audio.js checks before sampling (avoids wasted work) ----
function shouldListenForChords() {
  return gameState === "playing" && !debugModeToggle.checked;
}

// ---- Score / combo / lives helpers ----
function addScore(points) {
  combo++;
  const comboBonus = Math.floor(combo / 5) * 5;
  score += points + comboBonus;
  updateHUD();
}

function loseLife() {
  lives--;
  combo = 0;
  updateHUD();

  if (lives <= 0) {
    triggerGameOver();
  }
}

function updateHUD() {
  scoreEl.textContent = score;
  comboEl.textContent = `x${combo}`;
  livesEl.textContent = "❤️".repeat(Math.max(lives, 0)) + "🖤".repeat(STARTING_LIVES - Math.max(lives, 0));
}

// ---- Collision detection ----
function checkCollision(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function checkAllCollisions() {
  if (isInvulnerable) return; // mid-queued-jump: never register a hit

  for (let i = obstacles.length - 1; i >= 0; i--) {
    if (checkCollision(player, obstacles[i])) {
      obstacles.splice(i, 1);
      loseLife();
    }
  }
}

// ---- Game state transitions ----
function triggerGameOver() {
  gameState = "gameover";

  if (score > highScore) {
    highScore = score;
    localStorage.setItem("chordRunnerHighScore", highScore);
  }

  finalScoreEl.textContent = score;
  finalHighscoreEl.textContent = highScore;
  gameoverScreen.classList.remove("hidden");
}

function startGame() {
  obstacles = [];
  framesSinceLastSpawn = 0;
  framesUntilNextSpawn = randomSpawnGap();
  score = 0;
  combo = 0;
  lives = STARTING_LIVES;
  jumpQueued = false;
  isInvulnerable = false;
  resetPlayer();
  setNewChord();
  updateHUD();

  gameoverScreen.classList.add("hidden");
  startScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  gameState = "playing";
  requestAnimationFrame(gameLoop);
}

// ---- Keyboard controls ----
document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && gameState === "playing" && debugModeToggle.checked) {
    e.preventDefault();
    handleChordAttempt(true);
  }
  if (e.code === "KeyP" && (gameState === "playing" || gameState === "paused")) {
    pauseBtn.click();
  }
});

// ---- Button wiring ----
startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);

const pauseBtn = document.getElementById("pause-btn");

pauseBtn.addEventListener("click", () => {
  if (gameState === "playing") {
    gameState = "paused";
    pauseBtn.textContent = "▶ Resume";
  } else if (gameState === "paused") {
    gameState = "playing";
    pauseBtn.textContent = "⏸ Pause";
    requestAnimationFrame(gameLoop);
  }
});

// ---- Connect real chord detection to gameplay ----
onChordDetected = function (result) {
  if (gameState === "playing") {
    handleChordAttempt(true);
  }
};

// ---- Drawing functions ----
function drawBackground() {
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
}

function drawGround() {
  ctx.fillStyle = "#0f3d2e";
  ctx.fillRect(0, GROUND_Y, GAME_WIDTH, GAME_HEIGHT - GROUND_Y);

  ctx.strokeStyle = "#1db954";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(GAME_WIDTH, GROUND_Y);
  ctx.stroke();
}

function drawPlayer() {
  ctx.fillStyle = isInvulnerable ? "#ffffff" : "#ffcc00"; // brief visual cue while safe-jumping
  ctx.fillRect(player.x, player.y, player.width, player.height);
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(player.x + 26, player.y + 10, 6, 6);
}

function drawObstacles() {
  ctx.fillStyle = "#e94560";
  for (const obstacle of obstacles) {
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
  }
}

// ---- The Game Loop ----
function gameLoop() {
  if (gameState !== "playing") return;

  updatePlayer();
  updateObstacles();
  updateJumpQueue();   // NEW: fires any queued jump at the safe moment
  checkAllCollisions();

  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  drawBackground();
  drawGround();
  drawObstacles();
  drawPlayer();

  requestAnimationFrame(gameLoop);
}