// Chord Runner - Step 11: Detect Guitar Notes

const micBtn = document.getElementById("mic-btn");
const micStatusEl = document.getElementById("mic-status");
const debugFrequencyEl = document.getElementById("debug-frequency");
const debugNoteEl = document.getElementById("debug-note");
const debugConfidenceEl = document.getElementById("debug-confidence");

let audioContext = null;
let microphoneStream = null;
let isMicConnected = false;

let analyser = null;       // Web Audio node that gives us access to raw waveform data
let sourceNode = null;     // connects the mic stream into the analyser
let timeDomainData = null; // buffer we'll repeatedly fill with waveform samples

// ---- Note frequency reference table ----
// Standard guitar string frequencies (open strings), used as a reference.
// We don't limit detection to ONLY these - we calculate any note name from
// any frequency using music theory below. This table is just for reference/testing.
const OPEN_STRING_FREQUENCIES = {
  E2: 82.41,  // low E (6th string)
  A2: 110.0,  // 5th string
  D3: 146.83, // 4th string
  G3: 196.0,  // 3rd string
  B3: 246.94, // 2nd string
  E4: 329.63  // high E (1st string)
};

// All 12 note names, used for frequency -> note-name conversion
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

    // ---- Set up the analysis pipeline ----
    sourceNode = audioContext.createMediaStreamSource(microphoneStream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048; // size of the waveform window we analyze each time

    sourceNode.connect(analyser);
    // NOTE: we do NOT connect analyser to audioContext.destination -
    // doing so would play the mic input back out the speakers (feedback loop!)

    timeDomainData = new Float32Array(analyser.fftSize);

    isMicConnected = true;
    micBtn.textContent = "🎤 Microphone Connected";
    micBtn.classList.add("connected");
    micBtn.disabled = true;

    micStatusEl.textContent = "🎤 Microphone Connected";
    micStatusEl.className = "connected";

    // Start the continuous pitch-detection loop
    detectPitchLoop();

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

// ---- Autocorrelation pitch detection ----
//
// The idea: a musical note is a repeating waveform. If we slide a copy of
// the waveform against itself by different amounts ("lags") and find the
// lag where it matches itself best, that lag IS the wave's period - and
// frequency = sampleRate / period.
//
// This tends to work better than naive FFT peak-picking for plucked string
// instruments because it directly finds the repeating pattern instead of
// getting confused by loud harmonics/overtones.
function autoCorrelate(buffer, sampleRate) {
  const SIZE = buffer.length;

  // 1. Check signal strength (RMS = root mean square, a measure of loudness)
  let rms = 0;
  for (let i = 0; i < SIZE; i++) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / SIZE);

  // If the signal is too quiet, don't bother - it's just noise/silence
  if (rms < 0.01) {
    return { frequency: -1, confidence: 0 };
  }

  // 2. Trim to the region of the buffer that actually has signal
  //    (skip leading/trailing near-silence to make correlation cleaner)
  let start = 0;
  let end = SIZE - 1;
  const threshold = 0.02;
  while (start < SIZE && Math.abs(buffer[start]) < threshold) start++;
  while (end > start && Math.abs(buffer[end]) < threshold) end--;

  const trimmed = buffer.slice(start, end);
  const trimmedSize = trimmed.length;
  if (trimmedSize < 512) {
    return { frequency: -1, confidence: 0 }; // not enough signal to analyze
  }

  // 3. Autocorrelate: for each possible lag, measure how similar the
  //    waveform is to a shifted copy of itself.
  const maxLag = Math.floor(trimmedSize / 2);
  const correlations = new Array(maxLag).fill(0);

  for (let lag = 0; lag < maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < maxLag; i++) {
      sum += trimmed[i] * trimmed[i + lag];
    }
    correlations[lag] = sum;
  }

  // 4. Find the first strong peak after the initial (always-highest) lag=0 point.
  //    Guitar range is roughly 70-1000 Hz, so we only search lags within that range.
  const minLag = Math.floor(sampleRate / 1000); // corresponds to ~1000 Hz (upper bound)
  const searchMaxLag = Math.min(maxLag, Math.floor(sampleRate / 70)); // ~70 Hz (lower bound)

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

  // 5. Parabolic interpolation: refine the lag estimate using the correlation
  //    values just before/after the best lag, for sub-sample accuracy.
  const y1 = correlations[bestLag - 1] || correlations[bestLag];
  const y2 = correlations[bestLag];
  const y3 = correlations[bestLag + 1] || correlations[bestLag];
  const a = (y1 + y3 - 2 * y2) / 2;
  const b = (y3 - y1) / 2;
  const refinedLag = a !== 0 ? bestLag - b / (2 * a) : bestLag;

  const frequency = sampleRate / refinedLag;

  // Confidence: how strong was the best correlation relative to the signal's own energy
  const normalizedCorrelation = correlations[0] !== 0 ? bestCorrelation / correlations[0] : 0;
  const confidence = Math.max(0, Math.min(1, normalizedCorrelation));

  return { frequency, confidence };
}

// ---- Frequency -> Note name conversion ----
// Uses the standard equal-temperament formula referenced to A4 = 440 Hz.
function frequencyToNote(frequency) {
  if (frequency <= 0) return null;

  const A4 = 440;
  // How many semitones away from A4 is this frequency?
  const semitonesFromA4 = 12 * Math.log2(frequency / A4);
  const roundedSemitones = Math.round(semitonesFromA4);

  // A4 is note index 9 (A) in our NOTE_NAMES array, octave 4
  const noteIndex = (((9 + roundedSemitones) % 12) + 12) % 12;
  const noteName = NOTE_NAMES[noteIndex];

  return noteName; // we only need the note letter (not octave) for chord matching
}

// ---- Continuous detection loop ----
const CONFIDENCE_THRESHOLD = 0.9; // minimum confidence to trust a reading

function detectPitchLoop() {
  if (!isMicConnected || !analyser) return;

  analyser.getFloatTimeDomainData(timeDomainData);
  const { frequency, confidence } = autoCorrelate(timeDomainData, audioContext.sampleRate);

  if (frequency > 0 && confidence >= CONFIDENCE_THRESHOLD) {
    const note = frequencyToNote(frequency);
    debugFrequencyEl.textContent = frequency.toFixed(1);
    debugNoteEl.textContent = note;
    debugConfidenceEl.textContent = `${Math.round(confidence * 100)}%`;
  } else {
    debugFrequencyEl.textContent = "--";
    debugNoteEl.textContent = "--";
    debugConfidenceEl.textContent = "--";
  }

  requestAnimationFrame(detectPitchLoop);
}
// Chord Runner - Step 12: Chord Recognition

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

// ---- Microphone setup (unchanged from Step 11) ----
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

// ---- Autocorrelation pitch detection (unchanged from Step 11) ----
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

// ---- Continuous single-note detection (runs always, drives the debug display) ----
const CONFIDENCE_THRESHOLD = 0.9;

let lastDetectedNote = null;
let lastDetectedFrequency = -1;
let lastDetectedConfidence = 0;

function detectPitchLoop() {
  if (!isMicConnected || !analyser) return;

  analyser.getFloatTimeDomainData(timeDomainData);
  const { frequency, confidence } = autoCorrelate(timeDomainData, audioContext.sampleRate);

  if (frequency > 0 && confidence >= CONFIDENCE_THRESHOLD) {
    const note = frequencyToNote(frequency);
    lastDetectedNote = note;
    lastDetectedFrequency = frequency;
    lastDetectedConfidence = confidence;

    debugFrequencyEl.textContent = frequency.toFixed(1);
    debugNoteEl.textContent = note;
    debugConfidenceEl.textContent = `${Math.round(confidence * 100)}%`;

    // Feed this detected note into the chord-sampling window, if one is active
    if (isSamplingChord) {
      collectedNotes.add(note);
    }
  } else {
    lastDetectedNote = null;
    debugFrequencyEl.textContent = "--";
    debugNoteEl.textContent = "--";
    debugConfidenceEl.textContent = "--";
  }

  requestAnimationFrame(detectPitchLoop);
}

// ---- Chord sampling window ----
// Instead of trying to detect all notes in a single instant (not realistic
// with one autocorrelation pass), we listen continuously for a short window
// after the player strums, and collect whichever distinct notes we detect
// across that window into a Set.
const CHORD_SAMPLE_DURATION_MS = 450;

let isSamplingChord = false;
let collectedNotes = new Set();

// Starts a sampling window and resolves with the collected notes once it ends.
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
// Compares detected notes against a target chord's expected notes,
// with tolerance for missing/extra notes since real strums are messy.
function matchChord(detectedNotesSet, targetChord) {
  const targetNotes = targetChord.notes; // e.g. ["C", "E", "G"]

  let matchedCount = 0;
  for (const note of targetNotes) {
    if (detectedNotesSet.has(note)) matchedCount++;
  }

  const unexpectedNotes = [...detectedNotesSet].filter(n => !targetNotes.includes(n));

  // Match rule: at least 2 of the target notes detected, AND no more than
  // 1 note that doesn't belong to the chord (allows for a little noise/bleed).
  const isMatch = matchedCount >= 2 && unexpectedNotes.length <= 1;

  const matchPercent = Math.round((matchedCount / targetNotes.length) * 100);

  return { isMatch, matchedCount, matchPercent, unexpectedNotes };
}

// ---- Public function: listen for a chord attempt and check it against target ----
// This is what script.js will call in Step 13 to trigger real chord detection.
async function detectChordAttempt(targetChord) {
  debugChordMatchEl.textContent = "Listening...";

  const detectedNotes = await sampleChordWindow();

  debugNotesHeardEl.textContent = detectedNotes.size > 0
    ? [...detectedNotes].join(", ")
    : "(none)";

  const result = matchChord(detectedNotes, targetChord);
  debugChordMatchEl.textContent = `${result.matchPercent}%`;

  return result; // { isMatch, matchedCount, matchPercent, unexpectedNotes }
}