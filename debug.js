// Chord Runner - Step 19: Debug Panel
// Reads (never writes) globals from other files:
//   audio.js:  isMicConnected, collectedNotes, matchChord()
//   script.js: currentChord, gameState, jumpQueued, getNearestUpcomingObstacle(),
//              PERFECT_DISTANCE, GOOD_DISTANCE

const debugPanelEl = document.getElementById("pitch-debug");
const debugToggleBtn = document.getElementById("debug-toggle-btn");
const debugMicEl = document.getElementById("debug-mic");
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
  // Skip all work while the panel is hidden
  if (debugPanelEl.classList.contains("hidden")) return;

  // ---- Mic status ----
  debugMicEl.textContent = isMicConnected ? "CONNECTED" : "NOT CONNECTED";
  debugMicEl.className = isMicConnected ? "dbg-good" : "dbg-bad";

  // ---- Target chord + live note check ----
  if (currentChord) {
    debugTargetEl.textContent = currentChord.name;

    if (isMicConnected) {
      // collectedNotes is filled by audio.js during each listening window,
      // so this updates live as notes are heard.
      debugTargetNotesEl.textContent = currentChord.notes
        .map((n) => (collectedNotes.has(n) ? `${n} ✓` : `${n} ✗`))
        .join("   ");

      const liveMatch = collectedNotes.size > 0
        ? matchChord(collectedNotes, currentChord).matchPercent
        : 0;
      debugLiveMatchEl.textContent = `${liveMatch}%`;
    } else {
      debugTargetNotesEl.textContent = currentChord.notes.join("   ");
      debugLiveMatchEl.textContent = "--";
    }
  } else {
    debugTargetEl.textContent = "--";
    debugTargetNotesEl.textContent = "--";
    debugLiveMatchEl.textContent = "--";
  }

  // ---- Obstacle distance + which timing zone it falls in ----
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

// Refresh 10 times per second (no need to match the 60fps game loop)
setInterval(updateDebugPanel, 100);