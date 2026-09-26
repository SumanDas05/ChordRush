// Chord Runner - Step 15: Difficulty System

const chords = {
  C: {
    name: "C Major",
    notes: ["C", "E", "G"],
    frets:   ["x", 3, 2, 0, 1, 0],
    fingers: [0, 3, 2, 0, 1, 0]
  },
  G: {
    name: "G Major",
    notes: ["G", "B", "D"],
    frets:   [3, 2, 0, 0, 0, 3],
    fingers: [2, 1, 0, 0, 0, 3]
  },
  Am: {
    name: "A Minor",
    notes: ["A", "C", "E"],
    frets:   ["x", 0, 2, 2, 1, 0],
    fingers: [0, 0, 2, 3, 1, 0]
  },
  Em: {
    name: "E Minor",
    notes: ["E", "G", "B"],
    frets:   [0, 2, 2, 0, 0, 0],
    fingers: [0, 2, 3, 0, 0, 0]
  },
  D: {
    name: "D Major",
    notes: ["D", "F#", "A"],
    frets:   ["x", "x", 0, 2, 3, 2],
    fingers: [0, 0, 0, 1, 3, 2]
  },
  A: {
    name: "A Major",
    notes: ["A", "C#", "E"],
    frets:   ["x", 0, 2, 2, 2, 0],
    fingers: [0, 0, 1, 2, 3, 0]
  },
  E: {
    name: "E Major",
    notes: ["E", "G#", "B"],
    frets:   [0, 2, 2, 1, 0, 0],
    fingers: [0, 2, 3, 1, 0, 0]
  },
  Am7: {
    name: "A Minor 7",
    notes: ["A", "C", "E", "G"],
    frets:   ["x", 0, 2, 0, 1, 0],
    fingers: [0, 0, 2, 0, 1, 0]
  },
  C7: {
    name: "C7",
    notes: ["C", "E", "G", "A#"],
    frets:   ["x", 3, 2, 3, 1, 0],
    fingers: [0, 3, 2, 4, 1, 0]
  },
  G7: {
    name: "G7",
    notes: ["G", "B", "D", "F"],
    frets:   [3, 2, 0, 0, 0, 1],
    fingers: [3, 2, 0, 0, 0, 1]
  },
  D7: {
    name: "D7",
    notes: ["D", "F#", "A", "C"],
    frets:   ["x", "x", 0, 2, 1, 2],
    fingers: [0, 0, 0, 2, 1, 3]
  }
};

// ---- Difficulty presets ----
// Each level controls: which chords appear, how fast obstacles move,
// and how forgiving the PERFECT/GOOD timing windows are.
const DIFFICULTY_PRESETS = {
  beginner: {
    label: "Beginner",
    chordKeys: ["C", "G", "Am", "Em"],
    worldSpeed: 1.2,
    perfectDistance: 260,
    goodDistance: 550
  },
  intermediate: {
    label: "Intermediate",
    chordKeys: ["C", "G", "Am", "Em", "D", "A", "E"],
    worldSpeed: 1.8,
    perfectDistance: 220,
    goodDistance: 480
  },
  advanced: {
    label: "Advanced",
    chordKeys: ["C", "G", "Am", "Em", "D", "A", "E", "Am7", "C7", "G7", "D7"],
    worldSpeed: 2.4,
    perfectDistance: 180,
    goodDistance: 400
  }
};

let activeChordKeys = DIFFICULTY_PRESETS.beginner.chordKeys; // default until a level is chosen
let lastChordKey = null;

function pickRandomChord() {
  let key;
  do {
    key = activeChordKeys[Math.floor(Math.random() * activeChordKeys.length)];
  } while (key === lastChordKey && activeChordKeys.length > 1);

  lastChordKey = key;
  return chords[key];
}

// Called from script.js when the player picks a difficulty level
function applyDifficulty(levelKey) {
  const preset = DIFFICULTY_PRESETS[levelKey];
  activeChordKeys = preset.chordKeys;
  lastChordKey = null;
  return preset;
}