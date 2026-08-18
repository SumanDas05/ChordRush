// Chord Runner - Step 8: Guitar Chord Diagrams
//
// Draws an SVG chord diagram into #chord-diagram based on a chord object
// from chords.js (using its "frets" and "fingers" arrays).
//
// String order in our data is [E, A, D, G, B, E] = low to high (index 0 to 5).
// We draw them left to right in that same order, matching how chord charts
// are conventionally shown (low E string on the left).

const chordDiagramEl = document.getElementById("chord-diagram");

// Layout constants for the SVG diagram
const DIAGRAM_WIDTH = 200;
const DIAGRAM_HEIGHT = 130;
const STRING_COUNT = 6;
const FRET_COUNT = 4; // how many frets we show
const NECK_TOP = 30;    // top of the fretboard (leaves room for open/muted markers above)
const NECK_LEFT = 20;
const NECK_RIGHT = DIAGRAM_WIDTH - 20;
const NECK_BOTTOM = NECK_TOP + 80;
const STRING_GAP = (NECK_RIGHT - NECK_LEFT) / (STRING_COUNT - 1);
const FRET_GAP = (NECK_BOTTOM - NECK_TOP) / FRET_COUNT;

function drawChordDiagram(chord) {
  const parts = [];

  parts.push(`<svg viewBox="0 0 ${DIAGRAM_WIDTH} ${DIAGRAM_HEIGHT}" xmlns="http://www.w3.org/2000/svg">`);

  // ---- Nut (thick top line) ----
  parts.push(`<rect x="${NECK_LEFT}" y="${NECK_TOP - 3}" width="${NECK_RIGHT - NECK_LEFT}" height="4" fill="#1db954" />`);

  // ---- Fret lines (horizontal) ----
  for (let f = 1; f <= FRET_COUNT; f++) {
    const y = NECK_TOP + f * FRET_GAP;
    parts.push(`<line x1="${NECK_LEFT}" y1="${y}" x2="${NECK_RIGHT}" y2="${y}" stroke="#555" stroke-width="1.5" />`);
  }

  // ---- String lines (vertical) ----
  for (let s = 0; s < STRING_COUNT; s++) {
    const x = NECK_LEFT + s * STRING_GAP;
    parts.push(`<line x1="${x}" y1="${NECK_TOP}" x2="${x}" y2="${NECK_BOTTOM}" stroke="#999" stroke-width="1.5" />`);
  }

  // ---- Open/Muted markers above the nut, and finger dots on the fretboard ----
  chord.frets.forEach((fret, s) => {
    const x = NECK_LEFT + s * STRING_GAP;

    if (fret === "x") {
      // Muted string: red X above the nut
      const y = NECK_TOP - 14;
      parts.push(`<text x="${x}" y="${y}" font-size="12" fill="#e94560" text-anchor="middle" font-weight="bold">✕</text>`);
    } else if (fret === 0) {
      // Open string: hollow circle above the nut
      const y = NECK_TOP - 14;
      parts.push(`<circle cx="${x}" cy="${y}" r="5" fill="none" stroke="#1db954" stroke-width="2" />`);
    } else {
      // Fretted note: filled circle placed between the two relevant fret lines
      const fretCenterY = NECK_TOP + (fret - 0.5) * FRET_GAP;
      parts.push(`<circle cx="${x}" cy="${fretCenterY}" r="9" fill="#1db954" />`);

      const fingerNum = chord.fingers[s];
      if (fingerNum > 0) {
        parts.push(`<text x="${x}" y="${fretCenterY + 4}" font-size="10" fill="#121212" text-anchor="middle" font-weight="bold">${fingerNum}</text>`);
      }
    }
  });

  parts.push(`</svg>`);

  chordDiagramEl.innerHTML = parts.join("");
}