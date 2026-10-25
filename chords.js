// Chord Runner - chords.js (supports guitar and ukulele)
//
// frets:   one number per string
//          Guitar  order: [E, A, D, G, B, E]   (6 strings, low to high)
//          Ukulele order: [G, C, E, A]         (4 strings, standard tuning)
//          "x" = muted, 0 = open, number = fret to press
// fingers: finger number per string (0 = none)

// ================= GUITAR CHORDS (unchanged) =================
const GUITAR_CHORDS = {
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

// ================= UKULELE CHORDS (standard GCEA tuning) =================
const UKULELE_CHORDS = {
  C: {
    name: "C Major",
    notes: ["C", "E", "G"],
    frets:   [0, 0, 0, 3],
    fingers: [0, 0, 0, 3]
  },
  G: {
    name: "G Major",
    notes: ["G", "B", "D"],
    frets:   [0, 2, 3, 2],
    fingers: [0, 1, 3, 2]
  },
  Am: {
    name: "A Minor",
    notes: ["A", "C", "E"],
    frets:   [2, 0, 0, 0],
    fingers: [2, 0, 0, 0]
  },
  F: {
    name: "F Major",
    notes: ["F", "A", "C"],
    frets:   [2, 0, 1, 0],
    fingers: [2, 0, 1, 0]
  },
  Em: {
    name: "E Minor",
    notes: ["E", "G", "B"],
    frets:   [0, 4, 3, 2],
    fingers: [0, 3, 2, 1]
  },
  Dm: {
    name: "D Minor",
    notes: ["D", "F", "A"],
    frets:   [2, 2, 1, 0],
    fingers: [2, 3, 1, 0]
  },
  D: {
    name: "D Major",
    notes: ["D", "F#", "A"],
    frets:   [2, 2, 2, 0],
    fingers: [1, 2, 3, 0]
  },
  A: {
    name: "A Major",
    notes: ["A", "C#", "E"],
    frets:   [2, 1, 0, 0],
    fingers: [2, 1, 0, 0]
  },
  E: {
    name: "E Major",
    notes: ["E", "G#", "B"],
    frets:   [4, 4, 4, 2],
    fingers: [3, 3, 3, 1]
  },
  Am7: {
    name: "A Minor 7",
    notes: ["A", "C", "E", "G"],
    frets:   [0, 0, 0, 0],
    fingers: [0, 0, 0, 0]
  },
  C7: {
    name: "C7",
    notes: ["C", "E", "G", "A#"],
    frets:   [0, 0, 0, 1],
    fingers: [0, 0, 0, 1]
  },
  G7: {
    name: "G7",
    notes: ["G", "B", "D", "F"],
    frets:   [0, 2, 1, 2],
    fingers: [0, 2, 1, 3]
  },
  D7: {
    name: "D7",
    notes: ["D", "F#", "A", "C"],
    frets:   [2, 2, 2, 3],
    fingers: [1, 1, 1, 2]
  }
};

// ================= INSTRUMENT DEFINITIONS =================
// Everything that differs between instruments lives here:
// its chords, the names of its strings, and which chords appear at each difficulty.
const INSTRUMENTS = {
  guitar: {
    label: "Guitar",
    emoji: "🎸",
    chords: GUITAR_CHORDS,
    stringNames: ["E", "A", "D", "G", "B", "E"],
    difficultyChords: {
      beginner:     ["C", "G", "Am", "Em"],
      intermediate: ["C", "G", "Am", "Em", "D", "A", "E"],
      advanced:     ["C", "G", "Am", "Em", "D", "A", "E", "Am7", "C7", "G7", "D7"]
    }
  },
  ukulele: {
    label: "Ukulele",
    emoji: "🌴",
    chords: UKULELE_CHORDS,
    stringNames: ["G", "C", "E", "A"],
    difficultyChords: {
      beginner:     ["C", "Am", "F", "G"],
      intermediate: ["C", "Am", "F", "G", "Dm", "Em", "D", "A"],
      advanced:     ["C", "Am", "F", "G", "Dm", "Em", "D", "A", "E", "Am7", "C7", "G7", "D7"]
    }
  }
};

// ---- Speed and timing presets (the same for both instruments) ----
const SPEED_PRESETS = {
  beginner:     { label: "Beginner",     worldSpeed: 2.6, perfectDistance: 520, goodDistance: 820 },
  intermediate: { label: "Intermediate", worldSpeed: 3.4, perfectDistance: 480, goodDistance: 780 },
  advanced:     { label: "Advanced",     worldSpeed: 4.2, perfectDistance: 440, goodDistance: 740 }
};

// ---- The ACTIVE instrument ----
// Other files read `chords` and `currentInstrument`. Switching instrument
// just points `chords` at a different set, so no other code has to change.
let currentInstrument = "guitar";
let chords = GUITAR_CHORDS;
let activeChordKeys = INSTRUMENTS.guitar.difficultyChords.beginner;
let lastChordKey = null;

function setInstrument(name) {
  const instrument = INSTRUMENTS[name];
  if (!instrument) return; // ignore unknown names

  currentInstrument = name;
  chords = instrument.chords;
  activeChordKeys = instrument.difficultyChords.beginner;
  lastChordKey = null;
}

function pickRandomChord() {
  let key;
  do {
    key = activeChordKeys[Math.floor(Math.random() * activeChordKeys.length)];
  } while (key === lastChordKey && activeChordKeys.length > 1);

  lastChordKey = key;
  return chords[key];
}

// Called from script.js when a game starts: picks the chord pool for the
// current instrument + difficulty, and returns the speed and timing values.
function applyDifficulty(levelKey) {
  activeChordKeys = INSTRUMENTS[currentInstrument].difficultyChords[levelKey];
  lastChordKey = null;
  return SPEED_PRESETS[levelKey];
}