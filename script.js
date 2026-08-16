// Chord Runner - Step 5: Obstacles

// ---- Screen elements ----
const startScreen = document.getElementById("start-screen");
const gameScreen = document.getElementById("game-screen");
const startBtn = document.getElementById("start-btn");

// ---- Canvas setup ----
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

const GAME_WIDTH = canvas.width;
const GAME_HEIGHT = canvas.height;
const GROUND_Y = GAME_HEIGHT - 50;

let isRunning = false;
let isGameOver = false;

// ---- Physics constants ----
const GRAVITY = 0.6;
const JUMP_FORCE = -12.5;

// ---- World scroll speed ----
const WORLD_SPEED = 5; // how fast obstacles move toward the player each frame

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
  // Random number of frames between spawns (roughly 1.3 to 2.3 seconds at 60fps)
  return Math.floor(Math.random() * 60) + 80;
}

function spawnObstacle() {
  const size = 30 + Math.random() * 20; // vary size a bit: 30-50px
  obstacles.push({
    x: GAME_WIDTH + size,
    y: GROUND_Y - size,
    width: size,
    height: size
  });
}

function updateObstacles() {
  // Spawn timer
  framesSinceLastSpawn++;
  if (framesSinceLastSpawn >= framesUntilNextSpawn) {
    spawnObstacle();
    framesSinceLastSpawn = 0;
    framesUntilNextSpawn = randomSpawnGap();
  }

  // Move obstacles left, remove ones that go off-screen
  for (let i = obstacles.length - 1; i >= 0; i--) {
    obstacles[i].x -= WORLD_SPEED;
    if (obstacles[i].x + obstacles[i].width < 0) {
      obstacles.splice(i, 1);
    }
  }
}

// ---- Collision detection (simple AABB - axis-aligned bounding box) ----
function checkCollision(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function checkAllCollisions() {
  for (const obstacle of obstacles) {
    if (checkCollision(player, obstacle)) {
      triggerGameOver();
      break;
    }
  }
}

function triggerGameOver() {
  isGameOver = true;
  isRunning = false;
}

function resetGame() {
  obstacles = [];
  framesSinceLastSpawn = 0;
  framesUntilNextSpawn = randomSpawnGap();
  isGameOver = false;
  resetPlayer();
}

// ---- Keyboard controls (TEMPORARY - Spacebar for testing only) ----
document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && isRunning) {
    e.preventDefault();
    jump();
  }
});

// ---- Start button wiring ----
startBtn.addEventListener("click", () => {
  startScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  resetGame();
  isRunning = true;
  requestAnimationFrame(gameLoop);
});

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

function drawGameOver() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 40px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("GAME OVER", GAME_WIDTH / 2, GAME_HEIGHT / 2 - 10);

  ctx.font = "16px sans-serif";
  ctx.fillText("Press Start to try again", GAME_WIDTH / 2, GAME_HEIGHT / 2 + 25);
  ctx.textAlign = "left"; // reset for future drawing
}

// ---- The Game Loop ----
function gameLoop() {
  if (!isRunning) {
    if (isGameOver) {
      // Draw one final frame showing the game-over overlay
      drawBackground();
      drawGround();
      drawObstacles();
      drawPlayer();
      drawGameOver();
    }
    return;
  }

  // 1. Update game state
  updatePlayer();
  updateObstacles();
  checkAllCollisions();

  // 2. Clear canvas
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // 3. Draw everything, back to front
  drawBackground();
  drawGround();
  drawObstacles();
  drawPlayer();

  // 4. Next frame
  requestAnimationFrame(gameLoop);
}