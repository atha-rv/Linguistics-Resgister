import { DIM_LABELS } from '../lib/biber.js';

const DIMS = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6'];
const NAMES = {
  d1: 'Involved production', d2: 'Narrative concerns', d3: 'Explicit reference',
  d4: 'Overt persuasion', d5: 'Abstract information', d6: 'On-line elaboration'
};

// Fixed scale per dimension, wide enough to hold Biber's own register range.
const SPAN = { d1: 60, d2: 20, d3: 20, d4: 15, d5: 15, d6: 12 };

const clamp = (v, s) => Math.max(-s, Math.min(s, v));
const pos = (v, s) => ((clamp(v, s) + s) / (2 * s)) * 100;

/**
 * @param root      container element
 * @param corpus    array of dimension objects from saved docs (may be empty)
 * @param draft     dimension object for the current text, or null
 * @param showPoles whether to print the axis pole names
 */
export function renderMeters(root, corpus, draft, showPoles = true) {
  root.innerHTML = '';
  const box = document.createElement('div');
  box.className = 'meters';

  DIMS.forEach((d, di) => {
    const s = SPAN[d];
    const vals = corpus.map(c => c[d]).filter(v => Number.isFinite(v));

    const row = document.createElement('div');
    row.className = 'meter';

    const name = document.createElement('div');
    name.className = 'name';
    name.innerHTML = `${NAMES[d]}<em>Dimension ${di + 1}</em>`;

    const track = document.createElement('div');
    track.className = 'track';

    // interquartile band of the corpus: the region your taste actually occupies
    if (vals.length >= 4) {
      const sorted = [...vals].sort((a, b) => a - b);
      const q = p => sorted[Math.floor((sorted.length - 1) * p)];
      const band = document.createElement('div');
      band.className = 'band';
      const l = pos(q(0.25), s), r = pos(q(0.75), s);
      band.style.left = l + '%';
      band.style.width = Math.max(r - l, 0.6) + '%';
      track.appendChild(band);
    }

    const zero = document.createElement('div');
    zero.className = 'zero';
    zero.style.left = '50%';
    track.appendChild(zero);

    if (showPoles) {
      const [lo, hi] = DIM_LABELS[d];
      const pl = document.createElement('div'); pl.className = 'pole l'; pl.textContent = lo;
      const pr = document.createElement('div'); pr.className = 'pole r'; pr.textContent = hi;
      track.append(pl, pr);
    }

    vals.forEach((v, i) => {
      const t = document.createElement('div');
      t.className = 'tick';
      t.style.left = pos(v, s) + '%';
      t.style.animationDelay = (di * 40 + i * 8) + 'ms';
      track.appendChild(t);
    });

    const val = document.createElement('div');
    val.className = 'val ' + (draft ? 'on' : 'off');

    if (draft && Number.isFinite(draft[d])) {
      const m = document.createElement('div');
      m.className = 'mark';
      m.style.left = 'calc(' + pos(draft[d], s) + '% - 1.5px)';
      track.appendChild(m);
      val.textContent = (draft[d] > 0 ? '+' : '') + draft[d].toFixed(1);
    } else if (vals.length) {
      val.textContent = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
    } else {
      val.textContent = '\u2014';
    }

    row.append(name, track, val);
    box.appendChild(row);
  });

  root.appendChild(box);
}
