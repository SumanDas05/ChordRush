// Chord Runner - chordDiagram.js (draws 4-string and 6-string diagrams)
// Draws a chord diagram into an element (defaults to the game's #chord-diagram).

const chordDiagramEl = document.getElementById("chord-diagram");

const DIAGRAM_WIDTH = 200;
const DIAGRAM_HEIGHT = 130;
const FRET_COUNT = 4;
const NECK_TOP = 30;
const NECK_BOTTOM = NECK_TOP + 80;
const FRET_GAP = (NECK_BOTTOM - NECK_TOP) / FRET_COUNT;

function drawChordDiagram(chord, targetEl = chordDiagramEl) {
  // The number of strings comes from the chord itself (6 for guitar, 4 for ukulele)
  const stringCount = chord.frets.length;

  // A 4-string neck is narrower, so the dots don't look spread out
  const neckLeft = stringCount <= 4 ? 50 : 20;
  const neckRight = DIAGRAM_WIDTH - neckLeft;
  const stringGap = (neckRight - neckLeft) / (stringCount - 1);

  // String names (E A D G B E or G C E A) come from chords.js
  const stringNames = (INSTRUMENTS[currentInstrument] || {}).stringNames || [];

  const parts = [];
  parts.push(`<svg viewBox="0 0 ${DIAGRAM_WIDTH} ${DIAGRAM_HEIGHT}" xmlns="http://www.w3.org/2000/svg">`);

  // Nut (thick top line)
  parts.push(`<rect x="${neckLeft}" y="${NECK_TOP - 3}" width="${neckRight - neckLeft}" height="4" fill="#1db954" />`);

  // Fret lines (horizontal)
  for (let f = 1; f <= FRET_COUNT; f++) {
    const y = NECK_TOP + f * FRET_GAP;
    parts.push(`<line x1="${neckLeft}" y1="${y}" x2="${neckRight}" y2="${y}" stroke="#555" stroke-width="1.5" />`);
  }

  // String lines (vertical) and the string name under each one
  for (let s = 0; s < stringCount; s++) {
    const x = neckLeft + s * stringGap;
    parts.push(`<line x1="${x}" y1="${NECK_TOP}" x2="${x}" y2="${NECK_BOTTOM}" stroke="#999" stroke-width="1.5" />`);

    if (stringNames[s]) {
      parts.push(`<text x="${x}" y="${NECK_BOTTOM + 16}" font-size="11" fill="#777" text-anchor="middle">${stringNames[s]}</text>`);
    }
  }

  // Open/muted markers above the nut, and finger dots on the fretboard
  chord.frets.forEach((fret, s) => {
    const x = neckLeft + s * stringGap;

    if (fret === "x") {
      // Muted string: red X above the nut
      parts.push(`<text x="${x}" y="${NECK_TOP - 14}" font-size="12" fill="#e94560" text-anchor="middle" font-weight="bold">✕</text>`);
    } else if (fret === 0) {
      // Open string: hollow circle above the nut
      parts.push(`<circle cx="${x}" cy="${NECK_TOP - 14}" r="5" fill="none" stroke="#1db954" stroke-width="2" />`);
    } else {
      // Fretted note: filled circle centred between two fret lines
      const fretCenterY = NECK_TOP + (fret - 0.5) * FRET_GAP;
      parts.push(`<circle cx="${x}" cy="${fretCenterY}" r="9" fill="#1db954" />`);

      const fingerNum = chord.fingers[s];
      if (fingerNum > 0) {
        parts.push(`<text x="${x}" y="${fretCenterY + 4}" font-size="10" fill="#121212" text-anchor="middle" font-weight="bold">${fingerNum}</text>`);
      }
    }
  });

  parts.push(`</svg>`);
  targetEl.innerHTML = parts.join("");
}