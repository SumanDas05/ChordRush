// Chord Runner - script.js (after Step U3: instrument picker)
// Depends on: chords.js, chordDiagram.js, audio.js, effects.js (loaded before this file)

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
const finalComboEl = document.getElementById("final-combo");
const finalAccuracyEl = document.getElementById("final-accuracy");
const finalCorrectEl = document.getElementById("final-correct");
const finalWrongEl = document.getElementById("final-wrong");
const finalMissedEl = document.getElementById("final-missed");

// ---- Chord panel elements ----
const chordNameEl = document.getElementById("chord-name");
const chordFeedbackEl = document.getElementById("chord-feedback");

// ---- Debug mode toggle ----
const debugModeToggle = document.getElementById("debug-mode-toggle");

// ---- Canvas setup ----
// Width is fixed (1280 logical units). Height follows the window's shape, so the
// scene fills the whole screen without stretching. See resizeCanvas() near the bottom.
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

const BASE_WIDTH = 1280;
const GROUND_HEIGHT = 110;
let GAME_WIDTH = BASE_WIDTH;
let GAME_HEIGHT = 720;
let GROUND_Y = GAME_HEIGHT - GROUND_HEIGHT;

// ---- Game state ----
let gameState = "start"; // "start" | "playing" | "paused" | "gameover"

// ---- Physics ----
// Jump arc: rises for 32 frames, 211 px high, about 65 frames in the air.
const GRAVITY = 0.4;
const JUMP_FORCE = -13;
const AIR_FRAMES = (-2 * JUMP_FORCE) / GRAVITY;
const INVULNERABLE_MS = Math.round((AIR_FRAMES / 60) * 1000);
const STARTING_LIVES = 3;

// ---- Difficulty-dependent values (overwritten by applySelectedDifficulty()) ----
let WORLD_SPEED = 2.6;
let PERFECT_DISTANCE = 520;
let GOOD_DISTANCE = 820;
let selectedDifficulty = "beginner";

// ---- Instrument (guitar or ukulele), remembered between visits ----
let selectedInstrument = localStorage.getItem("chordRunnerInstrument") === "ukulele" ? "ukulele" : "guitar";

// ---- Jump queue ----
// A correct chord queues a jump. The jump fires automatically at exactly the
// right moment, so the character is at the top of its arc as it passes over the rock.
let jumpQueued = false;
let isInvulnerable = false; // safety net during the jump arc

// ---- Score / lives / combo ----
let score = 0;
let combo = 0;
let highestCombo = 0;
let lives = STARTING_LIVES;
let highScore = Number(localStorage.getItem("chordRunnerHighScore")) || 0;

// ---- Accuracy tracking ----
let correctCount = 0;
let wrongCount = 0;
let missedCount = 0; // not incremented yet (always 0 for now)

// ---- Current chord (from chords.js) ----
let currentChord = null;

function setNewChord() {
  currentChord = pickRandomChord();
  chordNameEl.textContent = currentChord.name.toUpperCase();
  drawChordDiagram(currentChord);
  chordFeedbackEl.textContent = "";
  chordFeedbackEl.className = "";
  retriggerAnimation(chordNameEl, "chord-enter");
  retriggerAnimation(chordDiagramEl, "chord-enter");
  resetChordHold(); // from audio.js: start listening fresh for the new chord
}

// ---- Player (72 wide, 104 tall) ----
const player = {
  x: 220,
  y: GROUND_Y - 104,
  width: 72,
  height: 104,
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

// Hitboxes are a bit smaller than the drawings, which is fairer to the player
function getPlayerHitbox() {
  return { x: player.x + 14, y: player.y + 12, width: player.width - 28, height: player.height - 16 };
}

function getObstacleHitbox(o) {
  return { x: o.x + 8, y: o.y + 10, width: o.width - 16, height: o.height - 10 };
}

// ---- Obstacles ----
let obstacles = [];
let framesSinceLastSpawn = 0;
let framesUntilNextSpawn = 45; // the first rock appears quickly

function randomSpawnGap() {
  // 4.5 - 6.5 seconds between rocks at 60fps
  return Math.floor(Math.random() * 120) + 270;
}

function spawnObstacle() {
  const width = 52 + Math.random() * 16;
  const height = 54 + Math.random() * 18;
  obstacles.push({
    x: GAME_WIDTH + width,
    y: GROUND_Y - height,
    width,
    height,
    passed: false,
    jitter: Array.from({ length: 7 }, () => 0.88 + Math.random() * 0.2) // makes every rock look different
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

// ---- Nearest obstacle that hasn't been passed yet ----
// (distance can be negative if the obstacle is already overlapping the player)
function getNearestUpcomingObstacle() {
  let nearest = null;
  let nearestDistance = Infinity;

  for (const obstacle of obstacles) {
    if (obstacle.passed) continue;
    const distance = obstacle.x - player.x;
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = obstacle;
    }
  }

  return { obstacle: nearest, distance: nearestDistance };
}

// ---- Jump queue processing ----
// Distance (obstacle.x - player.x) at which a jump must start, so the rock's
// centre passes the player's centre exactly at the top of the arc.
function getJumpTriggerDistance(obstacle) {
  const framesToApex = -JUMP_FORCE / GRAVITY;
  return framesToApex * WORLD_SPEED + (player.width - obstacle.width) / 2;
}

function updateJumpQueue() {
  if (!jumpQueued) return;

  const { obstacle, distance } = getNearestUpcomingObstacle();
  if (!obstacle) return; // keep the jump ready until the next rock shows up

  if (distance <= getJumpTriggerDistance(obstacle)) {
    executeQueuedJump();
  }
}

function executeQueuedJump() {
  jumpQueued = false;
  jump();

  isInvulnerable = true;
  setTimeout(() => {
    isInvulnerable = false;
  }, INVULNERABLE_MS);
}

// ---- Chord attempt handling ----
// Called by Debug Mode (Spacebar / tap) or by real instrument detection (audio.js).
function handleChordAttempt(isCorrect) {
  const popupX = player.x + player.width / 2;
  const popupY = player.y - 14;

  if (!isCorrect) {
    wrongCount++;
    chordFeedbackEl.textContent = `${currentChord.name} ✗ WRONG CHORD`;
    chordFeedbackEl.className = "wrong";
    spawnPopup("✗", popupX, popupY, "#e94560");
    triggerShake(6);
    playSound("wrong");
    return;
  }

  correctCount++;

  // Timing quality = how close the rock was when you played the chord
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

  const scoreBefore = score;
  addScore(points);
  const gained = score - scoreBefore;

  chordFeedbackEl.textContent = `${currentChord.name} ✓ ${timingLabel}`;
  chordFeedbackEl.className = feedbackClass;

  // ---- Effects ----
  const isPerfect = feedbackClass === "perfect";
  spawnParticles(popupX, player.y + player.height / 2, isPerfect ? "#ffd700" : "#1db954", isPerfect ? 26 : 14);
  spawnPopup(`${timingLabel.replace("!", "")} +${gained}`, popupX, popupY, isPerfect ? "#ffd700" : "#1db954");
  playSound(isPerfect ? "perfect" : "good");
  retriggerAnimation(comboEl, "combo-pulse");

  // Combo milestone every 5 in a row
  if (combo > 0 && combo % 5 === 0) {
    spawnPopup(`COMBO x${combo}!`, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, "#ff9f1c");
    spawnParticles(GAME_WIDTH / 2, GAME_HEIGHT / 2, "#ff9f1c", 34);
    playSound("combo");
  }

  jumpQueued = true;

  setTimeout(() => {
    if (gameState === "playing") setNewChord();
  }, 500);
}

// ---- audio.js checks this before listening ----
function shouldListenForChords() {
  return gameState === "playing" && !debugModeToggle.checked;
}

// ---- Score / combo / lives helpers ----
function getComboMultiplier() {
  return Math.min(1 + combo * 0.1, 3);
}

function addScore(points) {
  combo++;
  if (combo > highestCombo) highestCombo = combo;

  const multiplier = getComboMultiplier();
  score += Math.round(points * multiplier);
  updateHUD();
}

function loseLife() {
  lives--;
  combo = 0;
  updateHUD();

  triggerShake(14);
  spawnParticles(player.x + player.width / 2, player.y + player.height / 2, "#e94560", 28);
  spawnPopup("OUCH!", player.x + player.width / 2, player.y - 14, "#e94560");
  playSound("hit");

  if (lives <= 0) {
    triggerGameOver();
  }
}

function calculateAccuracy() {
  const totalAttempts = correctCount + wrongCount;
  if (totalAttempts === 0) return 100;
  return Math.round((correctCount / totalAttempts) * 100);
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
  if (isInvulnerable) return;

  const playerBox = getPlayerHitbox();
  for (let i = obstacles.length - 1; i >= 0; i--) {
    if (checkCollision(playerBox, getObstacleHitbox(obstacles[i]))) {
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

  playSound("gameover");
  finalScoreEl.textContent = score;
  finalHighscoreEl.textContent = highScore;
  finalComboEl.textContent = `x${highestCombo}`;
  finalAccuracyEl.textContent = `${calculateAccuracy()}%`;
  finalCorrectEl.textContent = correctCount;
  finalWrongEl.textContent = wrongCount;
  finalMissedEl.textContent = missedCount;
  gameoverScreen.classList.remove("hidden");
}

function startGame() {
  applySelectedDifficulty();

  gameoverScreen.classList.add("hidden");
  startScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  obstacles = [];
  framesSinceLastSpawn = 0;
  framesUntilNextSpawn = 45;
  score = 0;
  combo = 0;
  highestCombo = 0;
  correctCount = 0;
  wrongCount = 0;
  missedCount = 0;
  lives = STARTING_LIVES;
  jumpQueued = false;
  isInvulnerable = false;

  resizeCanvas(); // also rebuilds the background
  resetPlayer();
  resetChordDetector(); // from audio.js
  setNewChord();
  updateHUD();

  pauseBtn.textContent = "⏸ Pause";
  gameState = "playing";
  requestAnimationFrame(gameLoop);
}

// ---- Keyboard controls ----
// Spacebar only works when Debug Mode is checked.
document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && gameState === "playing" && debugModeToggle.checked) {
    e.preventDefault();
    handleChordAttempt(true);
  }
  if (e.code === "KeyP" && (gameState === "playing" || gameState === "paused")) {
    pauseBtn.click();
  }
});

// ---- Difficulty selection (start screen) ----
const difficultyButtons = document.querySelectorAll(".difficulty-btn");

difficultyButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    difficultyButtons.forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    selectedDifficulty = btn.dataset.level;
  });
});

// ---- Instrument selection (start screen) ----
const instrumentButtons = document.querySelectorAll(".instrument-btn");

function selectInstrument(name) {
  selectedInstrument = name;
  localStorage.setItem("chordRunnerInstrument", name);

  // Highlight only the card that matches the chosen instrument
  instrumentButtons.forEach((b) => {
    b.classList.toggle("selected", b.dataset.instrument === name);
  });

  setInstrument(name); // chords.js: switches the chord set
}

instrumentButtons.forEach((btn) => {
  btn.addEventListener("click", () => selectInstrument(btn.dataset.instrument));
});

selectInstrument(selectedInstrument); // apply the saved choice when the page loads

function applySelectedDifficulty() {
  const preset = applyDifficulty(selectedDifficulty); // from chords.js
  WORLD_SPEED = preset.worldSpeed;
  PERFECT_DISTANCE = preset.perfectDistance;
  GOOD_DISTANCE = preset.goodDistance;
}

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
onChordDetected = function () {
  if (gameState === "playing") handleChordAttempt(true);
};

onChordWrong = function () {
  if (gameState === "playing") handleChordAttempt(false);
};

// ---- Rendering ----
function renderFrame() {
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.save();
  if (shakeFrames > 0) {
    ctx.translate((Math.random() - 0.5) * shakeFrames, (Math.random() - 0.5) * shakeFrames);
  }
  renderBackground();
  renderGround();
  renderObstacles();
  renderPlayer();
  renderEffects();
  ctx.restore();
}

// ---- The Game Loop ----
function gameLoop() {
  if (gameState !== "playing") return;

  updatePlayer();
  updateObstacles();
  updateJumpQueue();
  checkAllCollisions();
  updateEffects();

  renderFrame();
  requestAnimationFrame(gameLoop);
}

// ---- Canvas sizing: fill the whole window without distortion ----
function resizeCanvas() {
  const oldGround = GROUND_Y;
  const aspect = window.innerHeight / Math.max(window.innerWidth, 1);

  GAME_WIDTH = BASE_WIDTH;
  GAME_HEIGHT = Math.round(Math.min(Math.max(BASE_WIDTH * aspect, 520), 900));
  GROUND_Y = GAME_HEIGHT - GROUND_HEIGHT;

  canvas.width = GAME_WIDTH;   // (changing width/height also clears the canvas)
  canvas.height = GAME_HEIGHT;

  // keep everything standing on the ground
  const delta = GROUND_Y - oldGround;
  player.y += delta;
  for (const o of obstacles) o.y += delta;

  resetEffects();
  if (gameState === "paused" || gameState === "gameover") renderFrame();
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Debug Mode on touch devices: tap the screen instead of pressing Spacebar
canvas.addEventListener("pointerdown", () => {
  if (gameState === "playing" && debugModeToggle.checked) {
    handleChordAttempt(true);
  }
});