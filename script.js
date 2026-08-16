// Chord Runner - Step 3: Canvas Game Area

// ---- Screen elements ----
const startScreen = document.getElementById("start-screen");
const gameScreen = document.getElementById("game-screen");
const startBtn = document.getElementById("start-btn");

// ---- Canvas setup ----
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

// Canvas internal resolution (drawing coordinates)
const GAME_WIDTH = canvas.width;   // 860
const GAME_HEIGHT = canvas.height; // 350
const GROUND_Y = GAME_HEIGHT - 50; // ground line sits 50px above the bottom

let isRunning = false; // controls whether the game loop updates

// ---- Start button wiring ----
startBtn.addEventListener("click", () => {
  startScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  isRunning = true;
  requestAnimationFrame(gameLoop);
});

// ---- Drawing functions ----
function drawBackground() {
  // Sky
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
}

function drawGround() {
  // Ground strip
  ctx.fillStyle = "#0f3d2e";
  ctx.fillRect(0, GROUND_Y, GAME_WIDTH, GAME_HEIGHT - GROUND_Y);

  // Ground line (visual separator)
  ctx.strokeStyle = "#1db954";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(GAME_WIDTH, GROUND_Y);
  ctx.stroke();
}

// ---- The Game Loop ----
// This function runs roughly 60 times per second.
// Each call: clear the canvas, then redraw everything in its current state.
function gameLoop() {
  if (!isRunning) return;

  // 1. Clear the whole canvas before redrawing
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // 2. Draw everything, back to front
  drawBackground();
  drawGround();

  // 3. Schedule the next frame
  requestAnimationFrame(gameLoop);
}