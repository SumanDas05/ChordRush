// Chord Runner - Step 7: Guitar Chord Database

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
  }
};

let activeChordKeys = ["C", "G", "Am", "Em", "D", "A", "E"];
let lastChordKey = null;

function pickRandomChord() {
  let key;
  do {
    key = activeChordKeys[Math.floor(Math.random() * activeChordKeys.length)];
  } while (key === lastChordKey && activeChordKeys.length > 1);

  lastChordKey = key;
  return chords[key];
}