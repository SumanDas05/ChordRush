// Chord Runner - Chord diagrams (SVG)
// Draws a chord diagram into an element (defaults to the game's #chord-diagram).

const chordDiagramEl = document.getElementById("chord-diagram");

const DIAGRAM_WIDTH = 200;
const DIAGRAM_HEIGHT = 130;
const STRING_COUNT = 6;
const FRET_COUNT = 4;
const NECK_TOP = 30;
const NECK_LEFT = 20;
const NECK_RIGHT = DIAGRAM_WIDTH - 20;
const NECK_BOTTOM = NECK_TOP + 80;
const STRING_GAP = (NECK_RIGHT - NECK_LEFT) / (STRING_COUNT - 1);
const FRET_GAP = (NECK_BOTTOM - NECK_TOP) / FRET_COUNT;

function drawChordDiagram(chord, targetEl = chordDiagramEl) {
  const parts = [];

  parts.push(`<svg viewBox="0 0 ${DIAGRAM_WIDTH} ${DIAGRAM_HEIGHT}" xmlns="http://www.w3.org/2000/svg">`);

  // Nut (thick top line)
  parts.push(`<rect x="${NECK_LEFT}" y="${NECK_TOP - 3}" width="${NECK_RIGHT - NECK_LEFT}" height="4" fill="#1db954" />`);

  // Fret lines (horizontal)
  for (let f = 1; f <= FRET_COUNT; f++) {
    const y = NECK_TOP + f * FRET_GAP;
    parts.push(`<line x1="${NECK_LEFT}" y1="${y}" x2="${NECK_RIGHT}" y2="${y}" stroke="#555" stroke-width="1.5" />`);
  }

  // String lines (vertical)
  for (let s = 0; s < STRING_COUNT; s++) {
    const x = NECK_LEFT + s * STRING_GAP;
    parts.push(`<line x1="${x}" y1="${NECK_TOP}" x2="${x}" y2="${NECK_BOTTOM}" stroke="#999" stroke-width="1.5" />`);
  }

  // Open/muted markers and finger dots
  chord.frets.forEach((fret, s) => {
    const x = NECK_LEFT + s * STRING_GAP;

    if (fret === "x") {
      const y = NECK_TOP - 14;
      parts.push(`<text x="${x}" y="${y}" font-size="12" fill="#e94560" text-anchor="middle" font-weight="bold">✕</text>`);
    } else if (fret === 0) {
      const y = NECK_TOP - 14;
      parts.push(`<circle cx="${x}" cy="${y}" r="5" fill="none" stroke="#1db954" stroke-width="2" />`);
    } else {
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