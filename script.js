// Chord Runner - Step 7: Guitar Chord Database

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

// ---- Canvas setup ----
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

const GAME_WIDTH = canvas.width;
const GAME_HEIGHT = canvas.height;
const GROUND_Y = GAME_HEIGHT - 50;

// ---- Game state ----
let gameState = "start"; // "start" | "playing" | "gameover"

// ---- Physics constants ----
const GRAVITY = 0.6;
const JUMP_FORCE = -12.5;
const WORLD_SPEED = 5;
const STARTING_LIVES = 3;

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
  return Math.floor(Math.random() * 60) + 80;
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
      addScore(10);
      setNewChord();
    }

    if (obstacle.x + obstacle.width < 0) {
      obstacles.splice(i, 1);
    }
  }
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
  resetPlayer();
  setNewChord();
  updateHUD();

  gameoverScreen.classList.add("hidden");
  startScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  gameState = "playing";
  requestAnimationFrame(gameLoop);
}

// ---- Keyboard controls (TEMPORARY - Spacebar for testing only) ----
document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && gameState === "playing") {
    e.preventDefault();
    jump();
  }
});

// ---- Button wiring ----
startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);

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
  ctx.fillStyle = "#ffcc00";
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
  checkAllCollisions();

  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  drawBackground();
  drawGround();
  drawObstacles();
  drawPlayer();

  requestAnimationFrame(gameLoop);
}