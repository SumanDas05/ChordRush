// Chord Runner - Step 13: Real Guitar Controls the Character

const micBtn = document.getElementById("mic-btn");
const micStatusEl = document.getElementById("mic-status");
const debugFrequencyEl = document.getElementById("debug-frequency");
const debugNoteEl = document.getElementById("debug-note");
const debugConfidenceEl = document.getElementById("debug-confidence");
const debugNotesHeardEl = document.getElementById("debug-notes-heard");
const debugChordMatchEl = document.getElementById("debug-chord-match");

let audioContext = null;
let microphoneStream = null;
let isMicConnected = false;

let analyser = null;
let sourceNode = null;
let timeDomainData = null;

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// ---- Microphone setup ----
async function enableMicrophone() {
  if (isMicConnected) return;

  micBtn.disabled = true;
  micBtn.textContent = "Requesting access...";

  try {
    microphoneStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    });

    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    sourceNode = audioContext.createMediaStreamSource(microphoneStream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;

    sourceNode.connect(analyser);

    timeDomainData = new Float32Array(analyser.fftSize);

    isMicConnected = true;
    micBtn.textContent = "🎤 Microphone Connected";
    micBtn.classList.add("connected");
    micBtn.disabled = true;

    micStatusEl.textContent = "🎤 Microphone Connected";
    micStatusEl.className = "connected";

    detectPitchLoop();
    startContinuousChordListening(); // NEW: begin listening for chord matches immediately

  } catch (error) {
    isMicConnected = false;
    micBtn.disabled = false;
    micBtn.textContent = "🎤 Enable Microphone";

    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      micStatusEl.textContent = "🎤 Microphone Permission Denied - check browser settings";
    } else if (error.name === "NotFoundError") {
      micStatusEl.textContent = "🎤 No microphone found on this device";
    } else {
      micStatusEl.textContent = "🎤 Microphone Permission Required";
    }
    micStatusEl.className = "denied";

    console.error("Microphone access error:", error);
  }
}

micBtn.addEventListener("click", enableMicrophone);

// ---- Autocorrelation pitch detection (unchanged) ----
function autoCorrelate(buffer, sampleRate) {
  const SIZE = buffer.length;

  let rms = 0;
  for (let i = 0; i < SIZE; i++) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / SIZE);

  if (rms < 0.01) {
    return { frequency: -1, confidence: 0 };
  }

  let start = 0;
  let end = SIZE - 1;
  const threshold = 0.02;
  while (start < SIZE && Math.abs(buffer[start]) < threshold) start++;
  while (end > start && Math.abs(buffer[end]) < threshold) end--;

  const trimmed = buffer.slice(start, end);
  const trimmedSize = trimmed.length;
  if (trimmedSize < 512) {
    return { frequency: -1, confidence: 0 };
  }

  const maxLag = Math.floor(trimmedSize / 2);
  const correlations = new Array(maxLag).fill(0);

  for (let lag = 0; lag < maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < maxLag; i++) {
      sum += trimmed[i] * trimmed[i + lag];
    }
    correlations[lag] = sum;
  }

  const minLag = Math.floor(sampleRate / 1000);
  const searchMaxLag = Math.min(maxLag, Math.floor(sampleRate / 70));

  let bestLag = -1;
  let bestCorrelation = -Infinity;

  for (let lag = minLag; lag < searchMaxLag; lag++) {
    if (correlations[lag] > bestCorrelation) {
      bestCorrelation = correlations[lag];
      bestLag = lag;
    }
  }

  if (bestLag === -1) {
    return { frequency: -1, confidence: 0 };
  }

  const y1 = correlations[bestLag - 1] || correlations[bestLag];
  const y2 = correlations[bestLag];
  const y3 = correlations[bestLag + 1] || correlations[bestLag];
  const a = (y1 + y3 - 2 * y2) / 2;
  const b = (y3 - y1) / 2;
  const refinedLag = a !== 0 ? bestLag - b / (2 * a) : bestLag;

  const frequency = sampleRate / refinedLag;

  const normalizedCorrelation = correlations[0] !== 0 ? bestCorrelation / correlations[0] : 0;
  const confidence = Math.max(0, Math.min(1, normalizedCorrelation));

  return { frequency, confidence };
}

function frequencyToNote(frequency) {
  if (frequency <= 0) return null;

  const A4 = 440;
  const semitonesFromA4 = 12 * Math.log2(frequency / A4);
  const roundedSemitones = Math.round(semitonesFromA4);

  const noteIndex = (((9 + roundedSemitones) % 12) + 12) % 12;
  return NOTE_NAMES[noteIndex];
}

// ---- Continuous single-note detection ----
const CONFIDENCE_THRESHOLD = 0.85; // slightly more lenient — was too strict for some notes

function detectPitchLoop() {
  if (!isMicConnected || !analyser) return;

  analyser.getFloatTimeDomainData(timeDomainData);
  const { frequency, confidence } = autoCorrelate(timeDomainData, audioContext.sampleRate);

  if (frequency > 0 && confidence >= CONFIDENCE_THRESHOLD) {
    const note = frequencyToNote(frequency);

    debugFrequencyEl.textContent = frequency.toFixed(1);
    debugNoteEl.textContent = note;
    debugConfidenceEl.textContent = `${Math.round(confidence * 100)}%`;

    if (isSamplingChord) {
      collectedNotes.add(note);
    }
  } else {
    debugFrequencyEl.textContent = "--";
    debugNoteEl.textContent = "--";
    debugConfidenceEl.textContent = "--";
  }

  requestAnimationFrame(detectPitchLoop);
}

// ---- Chord sampling window ----
const CHORD_SAMPLE_DURATION_MS = 450;

let isSamplingChord = false;
let collectedNotes = new Set();

function sampleChordWindow() {
  return new Promise((resolve) => {
    collectedNotes = new Set();
    isSamplingChord = true;

    setTimeout(() => {
      isSamplingChord = false;
      resolve(new Set(collectedNotes));
    }, CHORD_SAMPLE_DURATION_MS);
  });
}

// ---- Chord matching ----
function matchChord(detectedNotesSet, targetChord) {
  const targetNotes = targetChord.notes;

  let matchedCount = 0;
  for (const note of targetNotes) {
    if (detectedNotesSet.has(note)) matchedCount++;
  }

  const unexpectedNotes = [...detectedNotesSet].filter(n => !targetNotes.includes(n));

  // Loosened: full 6-string chords (like G, Em, E) naturally produce more
  // harmonic "noise" than partially-muted chords (like C, A), so we allow
  // more unexpected notes before rejecting a match.
  const isMatch = matchedCount >= 2 && unexpectedNotes.length <= 3;
  const matchPercent = Math.round((matchedCount / targetNotes.length) * 100);

  return { isMatch, matchedCount, matchPercent, unexpectedNotes };
}

async function detectChordAttempt(targetChord) {
  const detectedNotes = await sampleChordWindow();

  debugNotesHeardEl.textContent = detectedNotes.size > 0
    ? [...detectedNotes].join(", ")
    : "(none)";

  const result = matchChord(detectedNotes, targetChord);
  debugChordMatchEl.textContent = `${result.matchPercent}%`;

  return result;
}

// ---- NEW: Continuous chord-listening loop ----
// While the mic is connected AND the game is actively playing (and not in
// debug mode), this repeatedly samples chord windows back-to-back and
// reports successes up to script.js via onChordDetected (set by script.js).
let onChordDetected = null; // script.js will assign this callback

async function startContinuousChordListening() {
  while (isMicConnected) {
    // Only actually sample if the game wants us to (playing, not debug mode, not paused)
    if (typeof shouldListenForChords === "function" && shouldListenForChords() && typeof currentChord !== "undefined" && currentChord) {
      debugChordMatchEl.textContent = "Listening...";
      const result = await detectChordAttempt(currentChord);

      if (result.isMatch && onChordDetected) {
        onChordDetected(result);
      }
    } else {
      // Not actively needed right now - wait a bit before checking again,
      // so we're not burning CPU sampling for nothing (e.g. on the start screen).
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
}