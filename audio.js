// Chord Runner - audio.js (v2: chroma-based chord detection)
//
// How it works:
//  1. Every ~80 ms, take a frequency spectrum (FFT) of the microphone signal.
//  2. Find the spectral peaks and fold each one into one of 12 "pitch classes"
//     (C, C#, D ... B), ignoring the octave. This 12-number vector is a "chroma".
//  3. Compare the chroma with the notes of the target chord.
//  4. If it matches for a few ticks in a row after a strum, report success.

const micBtn = document.getElementById("mic-btn");
const micStatusEl = document.getElementById("mic-status");
const micLevelFillEl = document.getElementById("mic-level-fill");
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
let freqData = null;   // spectrum in dB
let magData = null;    // spectrum as linear amplitude
let timeData = null;   // raw waveform

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// ================= TUNING CONSTANTS =================
const FFT_SIZE = 16384;            // bigger = finer frequency resolution (needed for low E)
const ANALYSIS_INTERVAL_MS = 80;   // how often we analyse the sound
const MIN_FREQ = 80;               // ignore everything below the low E string
const MAX_FREQ = 1000;             // ignore very high harmonics
const MIN_RMS = 0.006;             // below this loudness = silence. LOWER if your mic is quiet
const PEAK_REL_THRESHOLD = 0.12;   // a spectral peak must be >= 12% of the strongest peak
const NOTE_PRESENT_RATIO = 0.30;   // a note counts as "heard" at >= 30% of the strongest note
const MATCH_ENERGY_RATIO = 0.65;   // >= 65% of the sound energy must be chord notes
const MATCH_COVERAGE = 0.66;       // at least 2 of 3 chord notes (3 of 4 for 7th chords)
const HOLD_TICKS = 3;              // must match this many ticks in a row (~240 ms)
const COOLDOWN_MS = 1200;          // ignore input right after a success (ring-out of the old chord)
const ONSET_RATIO = 1.5;           // a "new strum" is a jump in loudness of 1.5x
const WRONG_AFTER_TICKS = 14;      // ~1.1 s after a strum with no match = wrong chord
const CHORD_SAMPLE_DURATION_MS = 1600; // listening window used by Practice Mode

// ================= LIVE STATE (read by debug.js) =================
const EMPTY_MATCH = { isMatch: false, energyRatio: 0, coverage: 0 };
let latestHeardNotes = new Set();
let latestMatch = EMPTY_MATCH;
let latestRms = 0;

// ---- Detector state ----
let rmsHistory = [];
let armed = true;          // true = ready to accept a chord (needs a fresh strum after each success)
let cooldownUntil = 0;
let holdTicks = 0;
let pendingOnset = null;   // { ticks } while we wait to see if a strum turns out right or wrong

// ---- Callbacks assigned by script.js ----
let onChordDetected = null;
let onChordWrong = null;

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
    if (audioContext.state === "suspended") await audioContext.resume();

    sourceNode = audioContext.createMediaStreamSource(microphoneStream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = 0.6;

    // Mic -> analyser only. Never connect to destination (feedback loop!)
    sourceNode.connect(analyser);

    freqData = new Float32Array(analyser.frequencyBinCount);
    magData = new Float32Array(analyser.frequencyBinCount);
    timeData = new Float32Array(analyser.fftSize);

    isMicConnected = true;
    micBtn.textContent = "🎤 Connected";
    micBtn.classList.add("connected");
    micBtn.disabled = true;

    micStatusEl.textContent = "Listening";
    micStatusEl.className = "connected";

    resetChordDetector();
    setInterval(analyzeAudio, ANALYSIS_INTERVAL_MS);

  } catch (error) {
    isMicConnected = false;
    micBtn.disabled = false;
    micBtn.textContent = "🎤 Enable Microphone";

    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      micStatusEl.textContent = "Permission denied - check browser settings";
    } else if (error.name === "NotFoundError") {
      micStatusEl.textContent = "No microphone found";
    } else {
      micStatusEl.textContent = "Microphone permission required";
    }
    micStatusEl.className = "denied";

    console.error("Microphone access error:", error);
  }
}

micBtn.addEventListener("click", enableMicrophone);

// ---- Frequency -> note helpers ----
function frequencyToPitchClass(frequency) {
  const semitonesFromA4 = Math.round(12 * Math.log2(frequency / 440));
  return (((9 + semitonesFromA4) % 12) + 12) % 12;
}

function frequencyToNote(frequency) {
  if (frequency <= 0) return null;
  return NOTE_NAMES[frequencyToPitchClass(frequency)];
}

// ---- Spectrum -> chroma vector (12 numbers, one per note name) ----
function computeChroma() {
  analyser.getFloatFrequencyData(freqData);

  const binHz = audioContext.sampleRate / analyser.fftSize;
  const minBin = Math.max(2, Math.floor(MIN_FREQ / binHz));
  const maxBin = Math.min(freqData.length - 2, Math.ceil(MAX_FREQ / binHz));

  // dB -> linear amplitude, and find the strongest bin
  let maxMag = 0;
  for (let i = minBin - 1; i <= maxBin + 1; i++) {
    const m = Math.pow(10, freqData[i] / 20);
    magData[i] = m;
    if (m > maxMag) maxMag = m;
  }

  const chroma = new Array(12).fill(0);
  let peakFreq = -1;
  if (maxMag <= 0) return { chroma, peakFreq };

  const threshold = maxMag * PEAK_REL_THRESHOLD;
  let peakMag = 0;

  for (let i = minBin; i <= maxBin; i++) {
    const m = magData[i];
    // keep only local maxima that are strong enough
    if (m < threshold || m <= magData[i - 1] || m < magData[i + 1]) continue;

    // Parabolic interpolation on the dB values gives a more exact frequency
    const a = freqData[i - 1], b = freqData[i], c = freqData[i + 1];
    let delta = 0;
    if (isFinite(a) && isFinite(b) && isFinite(c)) {
      const denom = a - 2 * b + c;
      if (denom !== 0) delta = 0.5 * (a - c) / denom;
    }

    const freq = (i + delta) * binHz;
    chroma[frequencyToPitchClass(freq)] += m;

    if (m > peakMag) {
      peakMag = m;
      peakFreq = freq;
    }
  }

  return { chroma, peakFreq };
}

// ---- Compare a chroma vector with a chord ----
function scoreChord(chord, chroma) {
  let total = 0;
  let max = 0;
  for (const v of chroma) {
    total += v;
    if (v > max) max = v;
  }
  if (total === 0) return EMPTY_MATCH;

  let chordEnergy = 0;
  let present = 0;
  for (const noteName of chord.notes) {
    const v = chroma[NOTE_NAMES.indexOf(noteName)];
    chordEnergy += v;
    if (v >= NOTE_PRESENT_RATIO * max) present++;
  }

  const energyRatio = chordEnergy / total;
  const coverage = present / chord.notes.length;

  return {
    isMatch: energyRatio >= MATCH_ENERGY_RATIO && coverage >= MATCH_COVERAGE,
    energyRatio,
    coverage
  };
}

// ---- Detector control (called by script.js) ----
function resetChordDetector() {
  armed = true;
  cooldownUntil = 0;
  holdTicks = 0;
  pendingOnset = null;
  rmsHistory = [];
  latestMatch = EMPTY_MATCH;
}

function resetChordHold() {
  holdTicks = 0;
  pendingOnset = null;
}

// ---- Practice Mode sampling window ----
let isSamplingChord = false;
let collectedNotes = new Set();
let noteTickCounts = {};

function sampleChordWindow() {
  return new Promise((resolve) => {
    collectedNotes = new Set();
    noteTickCounts = {};
    isSamplingChord = true;

    setTimeout(() => {
      isSamplingChord = false;
      resolve(new Set(collectedNotes));
    }, CHORD_SAMPLE_DURATION_MS);
  });
}

// Used by Practice Mode: which target notes were heard
function matchChord(detectedNotesSet, targetChord) {
  const targetNotes = targetChord.notes;

  let matchedCount = 0;
  for (const note of targetNotes) {
    if (detectedNotesSet.has(note)) matchedCount++;
  }

  const unexpectedNotes = [...detectedNotesSet].filter(n => !targetNotes.includes(n));

  const isMatch = matchedCount >= 2 && unexpectedNotes.length <= 3;
  const matchPercent = Math.round((matchedCount / targetNotes.length) * 100);

  return { isMatch, matchedCount, matchPercent, unexpectedNotes };
}

// ================= THE ANALYSIS TICK (runs every 80 ms) =================
function analyzeAudio() {
  if (!isMicConnected) return;

  // ---- 1. Loudness: RMS of the newest 4096 samples ----
  analyser.getFloatTimeDomainData(timeData);
  let sum = 0;
  const n = 4096;
  for (let i = timeData.length - n; i < timeData.length; i++) {
    sum += timeData[i] * timeData[i];
  }
  const rms = Math.sqrt(sum / n);
  latestRms = rms;
  micLevelFillEl.style.width = Math.min(100, Math.sqrt(rms) * 180) + "%";

  const hasSound = rms >= MIN_RMS;

  // ---- 2. Onset: did loudness jump compared with the last ~half second? (= a new strum) ----
  const baseline = rmsHistory.length > 0 ? Math.min(...rmsHistory) : rms;
  const onset = hasSound && rms >= MIN_RMS * 1.5 && rms > baseline * ONSET_RATIO;
  rmsHistory.push(rms);
  if (rmsHistory.length > 6) rmsHistory.shift();

  // ---- 3. Chroma ----
  let chroma = new Array(12).fill(0);
  let peakFreq = -1;
  if (hasSound) {
    ({ chroma, peakFreq } = computeChroma());
  }

  let total = 0;
  let max = 0;
  for (const v of chroma) {
    total += v;
    if (v > max) max = v;
  }

  const heard = new Set();
  if (max > 0) {
    chroma.forEach((v, i) => {
      if (v >= NOTE_PRESENT_RATIO * max) heard.add(NOTE_NAMES[i]);
    });
  }
  latestHeardNotes = heard;

  // ---- 4. Debug readout ----
  debugFrequencyEl.textContent = peakFreq > 0 ? peakFreq.toFixed(1) : "--";
  debugNoteEl.textContent = peakFreq > 0 ? frequencyToNote(peakFreq) : "--";
  debugConfidenceEl.textContent = total > 0 ? Math.round((max / total) * 100) + "%" : "--";
  debugNotesHeardEl.textContent = heard.size > 0 ? [...heard].join(", ") : "(none)";

  // ---- 5. Practice Mode: collect notes that appear in at least 2 ticks ----
  if (isSamplingChord && hasSound) {
    for (const note of heard) {
      noteTickCounts[note] = (noteTickCounts[note] || 0) + 1;
      if (noteTickCounts[note] >= 2) collectedNotes.add(note);
    }
  }

  // ---- 6. Game: is the game asking for a chord right now? ----
  const listening =
    typeof shouldListenForChords === "function" &&
    shouldListenForChords() &&
    typeof currentChord !== "undefined" &&
    currentChord;

  if (!listening) {
    holdTicks = 0;
    pendingOnset = null;
    latestMatch = EMPTY_MATCH;
    debugChordMatchEl.textContent = "--";
    return;
  }

  const now = performance.now();
  if (now < cooldownUntil) return;

  // After a success we need a NEW strum before accepting again, otherwise
  // the old chord still ringing could be mistaken for the next chord.
  if (!armed && onset) armed = true;
  if (!armed) return;

  if (!hasSound) {
    holdTicks = 0;
    pendingOnset = null;
    latestMatch = EMPTY_MATCH;
    debugChordMatchEl.textContent = "--";
    return;
  }

  const result = scoreChord(currentChord, chroma);
  latestMatch = result;

  if (onset && !pendingOnset) pendingOnset = { ticks: 0 };

  holdTicks = result.isMatch ? holdTicks + 1 : 0;
  debugChordMatchEl.textContent = `hold ${holdTicks}/${HOLD_TICKS}`;

  // ---- Success ----
  if (holdTicks >= HOLD_TICKS) {
    armed = false;
    holdTicks = 0;
    pendingOnset = null;
    latestMatch = EMPTY_MATCH;
    cooldownUntil = now + COOLDOWN_MS;
    if (onChordDetected) onChordDetected(result);
    return;
  }

  // ---- A strum happened but never matched = wrong chord ----
  if (pendingOnset) {
    pendingOnset.ticks++;
    if (pendingOnset.ticks >= WRONG_AFTER_TICKS) {
      pendingOnset = null;
      if (onChordWrong) onChordWrong([...heard]);
    }
  }
}