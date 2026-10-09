// Chord Runner - Step 17: Practice Mode
//
// Lets the player pick any chord, strum it, and see which notes were heard.
// Reuses sampleChordWindow(), matchChord(), enableMicrophone() and
// isMicConnected from audio.js, and drawChordDiagram() from chordDiagram.js.

// ---- Elements ----
const practiceBtn = document.getElementById("practice-btn");
const practiceScreen = document.getElementById("practice-screen");
const practiceBackBtn = document.getElementById("practice-back-btn");
const practiceChordButtonsEl = document.getElementById("practice-chord-buttons");
const practiceChordNameEl = document.getElementById("practice-chord-name");
const practiceDiagramEl = document.getElementById("practice-diagram");
const practiceNotesEl = document.getElementById("practice-notes");
const practiceAccuracyEl = document.getElementById("practice-accuracy");
const practiceFeedbackEl = document.getElementById("practice-feedback");
const practiceMicBtn = document.getElementById("practice-mic-btn");
const practiceListenBtn = document.getElementById("practice-listen-btn");
const practiceMicStatusEl = document.getElementById("practice-mic-status");

// ---- State ----
let practiceChordKey = null;
let practiceListening = false;   // true while the player wants listening ON
let practiceLoopActive = false;  // true while a listening loop is still running

// ---- Build one button per chord in the database ----
function buildPracticeChordButtons() {
  for (const key of Object.keys(chords)) {
    const btn = document.createElement("button");
    btn.className = "practice-chord-btn";
    btn.textContent = chords[key].name;
    btn.dataset.key = key;
    btn.addEventListener("click", () => selectPracticeChord(key));
    practiceChordButtonsEl.appendChild(btn);
  }
}

// ---- Show the target notes, each marked heard / missing / not-yet-tested ----
function renderPracticeNotes(chord, heardSet) {
  practiceNotesEl.innerHTML = "";

  for (const note of chord.notes) {
    const span = document.createElement("span");
    span.className = "practice-note";

    if (heardSet === null) {
      span.textContent = note;
    } else if (heardSet.has(note)) {
      span.textContent = `${note} ✓`;
      span.classList.add("heard");
    } else {
      span.textContent = `${note} ✗`;
      span.classList.add("missing");
    }

    practiceNotesEl.appendChild(span);
  }
}

function selectPracticeChord(key) {
  practiceListening = false; // stop any listening for the previous chord
  updateListenButton();

  practiceChordKey = key;
  const chord = chords[key];

  practiceChordNameEl.textContent = chord.name.toUpperCase();
  drawChordDiagram(chord, practiceDiagramEl);
  renderPracticeNotes(chord, null);

  practiceAccuracyEl.textContent = "";
  practiceFeedbackEl.textContent = "Press Start Listening, then strum";
  practiceFeedbackEl.className = "";

  document.querySelectorAll(".practice-chord-btn").forEach((b) => {
    b.classList.toggle("selected", b.dataset.key === key);
  });
}

// ---- Microphone ----
function updatePracticeMicStatus() {
  if (isMicConnected) {
    practiceMicBtn.textContent = "🎤 Microphone Connected";
    practiceMicBtn.classList.add("connected");
    practiceMicBtn.disabled = true;
    practiceMicStatusEl.textContent = "🎤 Microphone Connected";
  }
  updateListenButton();
}

practiceMicBtn.addEventListener("click", async () => {
  practiceMicStatusEl.textContent = "Requesting microphone access...";
  await enableMicrophone(); // from audio.js

  if (isMicConnected) {
    updatePracticeMicStatus();
  } else {
    // audio.js already wrote a specific error message into #mic-status
    practiceMicStatusEl.textContent = document.getElementById("mic-status").textContent;
  }
});

// ---- Listen button ----
function updateListenButton() {
  // Listening needs a connected mic and a selected chord. It is also locked
  // briefly while an old listening window is still finishing.
  practiceListenBtn.disabled = !isMicConnected || !practiceChordKey || (practiceLoopActive && !practiceListening);
  practiceListenBtn.textContent = practiceListening ? "■ Stop Listening" : "▶ Start Listening";
  practiceListenBtn.classList.toggle("active", practiceListening);
}

practiceListenBtn.addEventListener("click", () => {
  if (practiceListening) {
    practiceListening = false;
    practiceFeedbackEl.textContent = "Stopped";
    practiceFeedbackEl.className = "";
    updateListenButton();
    return;
  }

  practiceListening = true;
  updateListenButton();
  practiceLoop();
});

// ---- The listening loop: sample -> match -> show feedback -> repeat ----
async function practiceLoop() {
  if (practiceLoopActive) return;
  practiceLoopActive = true;

  try {
    while (practiceListening) {
      const chord = chords[practiceChordKey];

      practiceFeedbackEl.textContent = "Listening... strum now";
      practiceFeedbackEl.className = "";

      const heardNotes = await sampleChordWindow(); // from audio.js
      if (!practiceListening) break; // player pressed stop or changed chord mid-window

      showPracticeResult(chord, heardNotes);

      // Pause so the player can read the result before the next round
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  } finally {
    practiceLoopActive = false;
    updateListenButton();
  }
}

function showPracticeResult(chord, heardNotes) {
  renderPracticeNotes(chord, heardNotes);

  if (heardNotes.size === 0) {
    practiceAccuracyEl.textContent = "Accuracy: 0%";
    practiceFeedbackEl.textContent = "No sound detected. Strum louder or closer to the mic";
    practiceFeedbackEl.className = "retry";
    return;
  }

  const result = matchChord(heardNotes, chord); // from audio.js
  practiceAccuracyEl.textContent = `Accuracy: ${result.matchPercent}%`;

  if (result.unexpectedNotes.length > 0) {
    practiceAccuracyEl.textContent += `  (extra notes: ${result.unexpectedNotes.join(", ")})`;
  }

  if (result.matchPercent === 100) {
    practiceFeedbackEl.textContent = "Excellent! 🎉";
    practiceFeedbackEl.className = "excellent";
  } else if (result.matchPercent >= 66) {
    practiceFeedbackEl.textContent = "Good, almost there. Check the ✗ notes";
    practiceFeedbackEl.className = "good";
  } else {
    practiceFeedbackEl.textContent = "Keep trying. Compare your fingers with the diagram";
    practiceFeedbackEl.className = "retry";
  }
}

// ---- Screen navigation ----
practiceBtn.addEventListener("click", () => {
  startScreen.classList.add("hidden"); // startScreen comes from script.js
  practiceScreen.classList.remove("hidden");
  updatePracticeMicStatus();
});

practiceBackBtn.addEventListener("click", () => {
  practiceListening = false;
  practiceScreen.classList.add("hidden");
  startScreen.classList.remove("hidden");
});

// ---- Init ----
buildPracticeChordButtons();