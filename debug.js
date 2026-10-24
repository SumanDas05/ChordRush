// Chord Runner - debug.js (v2)
// Reads (never writes) globals from other files:
//   audio.js:  isMicConnected, latestHeardNotes, latestMatch, latestRms, MATCH_ENERGY_RATIO
//   script.js: currentChord, gameState, jumpQueued, getNearestUpcomingObstacle(),
//              PERFECT_DISTANCE, GOOD_DISTANCE

const debugPanelEl = document.getElementById("pitch-debug");
const debugToggleBtn = document.getElementById("debug-toggle-btn");
const debugMicEl = document.getElementById("debug-mic");
const debugRmsEl = document.getElementById("debug-rms");
const debugTargetEl = document.getElementById("debug-target");
const debugTargetNotesEl = document.getElementById("debug-target-notes");
const debugLiveMatchEl = document.getElementById("debug-live-match");
const debugDistanceEl = document.getElementById("debug-distance");
const debugStateEl = document.getElementById("debug-state");

function toggleDebugPanel() {
  debugPanelEl.classList.toggle("hidden");
  const isOpen = !debugPanelEl.classList.contains("hidden");
  debugToggleBtn.textContent = isOpen ? "🛠 Hide Debug" : "🛠 Debug";
  if (isOpen) updateDebugPanel();
}

debugToggleBtn.addEventListener("click", toggleDebugPanel);

document.addEventListener("keydown", (e) => {
  if (e.code === "KeyD" && gameState !== "start") {
    toggleDebugPanel();
  }
});

function updateDebugPanel() {
  if (debugPanelEl.classList.contains("hidden")) return;

  // ---- Mic ----
  debugMicEl.textContent = isMicConnected ? "CONNECTED" : "NOT CONNECTED";
  debugMicEl.className = isMicConnected ? "dbg-good" : "dbg-bad";
  debugRmsEl.textContent = isMicConnected ? latestRms.toFixed(4) : "--";

  // ---- Target chord and which of its notes are heard right now ----
  if (currentChord) {
    debugTargetEl.textContent = currentChord.name;

    if (isMicConnected) {
      debugTargetNotesEl.textContent = currentChord.notes
        .map((n) => (latestHeardNotes.has(n) ? `${n} ✓` : `${n} ✗`))
        .join("   ");
      debugLiveMatchEl.textContent =
        `${Math.round(latestMatch.energyRatio * 100)}% (need ${Math.round(MATCH_ENERGY_RATIO * 100)}%)`;
    } else {
      debugTargetNotesEl.textContent = currentChord.notes.join("   ");
      debugLiveMatchEl.textContent = "--";
    }
  } else {
    debugTargetEl.textContent = "--";
    debugTargetNotesEl.textContent = "--";
    debugLiveMatchEl.textContent = "--";
  }

  // ---- Obstacle distance and timing zone ----
  const { distance } = getNearestUpcomingObstacle();
  if (distance === Infinity) {
    debugDistanceEl.textContent = "-- (no obstacle ahead)";
  } else {
    let zone = "EARLY";
    if (distance <= PERFECT_DISTANCE) zone = "PERFECT zone";
    else if (distance <= GOOD_DISTANCE) zone = "GOOD zone";
    debugDistanceEl.textContent = `${Math.round(distance)}px (${zone})`;
  }

  // ---- Game state ----
  debugStateEl.textContent = `${gameState}${jumpQueued ? " | jump queued" : ""}`;
}

setInterval(updateDebugPanel, 100);