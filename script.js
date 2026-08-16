// Chord Runner - Step 4: Player Character

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

// ---- Physics constants ----
const GRAVITY = 0.6;        // how fast the player accelerates downward each frame
const JUMP_FORCE = -12.5;   // upward velocity applied on jump (negative = upward in canvas coords)

// ---- Player object ----
// Everything about the player lives in one object, so it's easy to
// pass around, reset, and reason about.
const player = {
  x: 100,                 // fixed horizontal position (the world moves, not the player, in endless runners)
  y: GROUND_Y - 50,       // vertical position (top-left corner of the player box)
  width: 40,
  height: 50,
  velocityY: 0,           // current vertical speed
  isOnGround: true
};

function resetPlayer() {
  player.y = GROUND_Y - player.height;
  player.velocityY = 0;
  player.isOnGround = true;
}

// ---- Player physics update ----
// Called every frame. Applies gravity, moves the player, and clamps to the ground.
function updatePlayer() {
  // Apply gravity to velocity
  player.velocityY += GRAVITY;

  // Apply velocity to position
  player.y += player.velocityY;

  // Ground collision: don't let the player fall through the floor
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

// ---- Keyboard controls (TEMPORARY - Spacebar for testing only) ----
document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && isRunning) {
    e.preventDefault(); // stop the page from scrolling on spacebar
    jump();
  }
});

// ---- Start button wiring ----
startBtn.addEventListener("click", () => {
  startScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  resetPlayer();
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

  // Simple face so it doesn't look like a random box
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(player.x + 26, player.y + 10, 6, 6); // eye
}

// ---- The Game Loop ----
function gameLoop() {
  if (!isRunning) return;

  // 1. Update game state
  updatePlayer();

  // 2. Clear canvas
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // 3. Draw everything, back to front
  drawBackground();
  drawGround();
  drawPlayer();

  // 4. Next frame
  requestAnimationFrame(gameLoop);
}