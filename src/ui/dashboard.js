import { analyze, vectorOf, standardize, METRIC_KEYS, METRIC_LABELS, METRIC_GROUPS } from '../lib/analyze.js';
import { allDocs, deleteDoc, getCached, setCached, clearAll, ENGINE } from '../lib/db.js';
import { pca, kmeans, silhouette, percentileOf, quantile, mean } from '../lib/stats.js';
import { renderMeters } from './meters.js';

const $ = id => document.getElementById(id);
const CLUSTER_INK = ['#2e31c9', '#0e7a63', '#a8471c', '#6c3fa0'];

let docs = [], mets = [], draft = null, labels = [], K = 1;

const fmt = (k, v) => {
  if (v == null || !Number.isFinite(v)) return '\u2014';
  if (k === 'mtld') return v.toFixed(0);
  if (k === 'mattr' || k === 'sentAC1' || k === 'sentSkew') return v.toFixed(2);
  if (k === 'longestShortRun') return v.toFixed(0);
  if (k.startsWith('d')) return (v > 0 ? '+' : '') + v.toFixed(1);
  return v.toFixed(1);
};

async function load() {
  docs = await allDocs();
  mets = [];
  for (const d of docs) {
    let m = await getCached(d.id);
    if (!m) { const a = analyze(d.text); if (!a) continue; m = { ...a.metrics, _type: a.textType.type }; await setCached(d.id, m); }
    mets.push(m);
  }
  $('corpusSize').textContent = docs.length
    ? `${docs.length} ${docs.length === 1 ? 'page' : 'pages'} · ${docs.reduce((a, d) => a + (d.words || 0), 0).toLocaleString()} words`
    : 'empty corpus';
  $('engine').textContent = 'engine ' + ENGINE;
}

/* ── metric table ───────────────────────────────────────────── */
function renderTable() {
  if (!mets.length) {
    $('table').innerHTML = `<div class="empty"><div class="lbl">No corpus yet</div>
      <p class="prose">Open something you admire and press Save in the toolbar.<br>
      The thresholds in your writing rules are invented until this table has writers in it.</p></div>`;
    return;
  }
  const cols = {};
  for (const k of METRIC_KEYS) {
    const v = mets.map(m => m[k]).filter(Number.isFinite).sort((a, b) => a - b);
    cols[k] = v;
  }
  let html = `<table><thead><tr>
    <th>Metric</th><th>Median</th><th>IQR</th><th>Draft</th><th>Percentile</th><th style="width:120px"></th>
  </tr></thead><tbody>`;

  for (const [group, keys] of METRIC_GROUPS) {
    html += `<tr class="group"><td colspan="6">${group}</td></tr>`;
    for (const k of keys) {
      const v = cols[k];
      const med = quantile(v, 0.5), q1 = quantile(v, 0.25), q3 = quantile(v, 0.75);
      const dv = draft ? draft.metrics[k] : null;
      const p = draft && v.length ? percentileOf(v, dv) : null;
      const extreme = p != null && (p < 0.1 || p > 0.9);

      let strip = '';
      if (v.length) {
        const lo = v[0], hi = v[v.length - 1], span = (hi - lo) || 1;
        const at = x => Math.max(0, Math.min(100, ((x - lo) / span) * 100));
        strip = '<span class="strip">' +
          v.map(x => `<b style="left:${at(x)}%"></b>`).join('') +
          (dv != null ? `<i style="left:${at(dv)}%"></i>` : '') + '</span>';
      }
      html += `<tr>
        <td>${METRIC_LABELS[k]}</td>
        <td class="num">${fmt(k, med)}</td>
        <td class="num" style="color:var(--ink-3)">${fmt(k, q1)}–${fmt(k, q3)}</td>
        <td class="num draft ${extreme ? 'hit' : ''}">${draft ? fmt(k, dv) : '\u2014'}</td>
        <td class="num draft ${extreme ? 'hit' : ''}">${p != null ? Math.round(p * 100) + 'th' : '\u2014'}</td>
        <td>${strip}</td>
      </tr>`;
    }
  }
  $('table').innerHTML = html + '</tbody></table>';
}

/* ── clusters + PCA scatter ─────────────────────────────────── */
function renderClusters() {
  const svg = $('scatter');
  svg.innerHTML = '';
  $('legend').innerHTML = '';

  if (mets.length < 6) {
    $('verdict').innerHTML = mets.length
      ? `<b>${mets.length}</b> pages saved. Clustering needs six before it says anything honest.`
      : `Nothing to cluster yet.`;
    $('clusterNote').textContent = '';
    return;
  }

  const rows = mets.map(m => vectorOf(m));
  const [Z] = standardize(rows);

  // pick k by silhouette
  let best = { k: 1, s: -1, labels: new Array(Z.length).fill(0) };
  for (let k = 2; k <= Math.min(4, Z.length - 1); k++) {
    let bs = -1, bl = null;
    for (let attempt = 0; attempt < 6; attempt++) {
      const r = kmeans(Z, k);
      const s = silhouette(Z, r.labels, k);
      if (s > bs) { bs = s; bl = r.labels; }
    }
    if (bs > best.s) best = { k, s: bs, labels: bl };
  }
  // a silhouette under 0.25 means the split is noise, not taste
  K = best.s >= 0.25 ? best.k : 1;
  labels = K > 1 ? best.labels : new Array(Z.length).fill(0);

  $('clusterNote').textContent = K > 1
    ? `k-means over ${METRIC_KEYS.length} standardised metrics · silhouette ${best.s.toFixed(2)}`
    : `no separable clusters · best silhouette ${best.s.toFixed(2)}`;

  $('verdict').innerHTML = K > 1
    ? `Your corpus splits into <b>${K}</b> groups, not one. You do not have a single taste; you have ${K}. Averaging them into one set of thresholds would describe writing you have never actually liked.`
    : `Your corpus holds together as <b>one</b> cluster. A single set of thresholds is defensible here.`;

  // PCA to 2D
  const { scores, explained } = pca(Z, 2);
  const dScore = draft ? projectDraft(Z, rows, draft) : null;
  const pts = scores.map((s, i) => ({ x: s[0], y: s[1], c: labels[i], i }));
  if (dScore) pts.push({ x: dScore[0], y: dScore[1], c: -1, i: -1 });

  const W = svg.clientWidth || 900, H = 380, PAD = 34;
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const xr = [Math.min(...xs), Math.max(...xs)], yr = [Math.min(...ys), Math.max(...ys)];
  const sx = v => PAD + ((v - xr[0]) / ((xr[1] - xr[0]) || 1)) * (W - 2 * PAD);
  const sy = v => H - PAD - ((v - yr[0]) / ((yr[1] - yr[0]) || 1)) * (H - 2 * PAD);

  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const el = (t, a) => { const e = document.createElementNS('http://www.w3.org/2000/svg', t); for (const k in a) e.setAttribute(k, a[k]); return e; };

  svg.append(el('rect', { x: 0, y: 0, width: W, height: H, fill: '#fff' }));
  svg.append(el('line', { x1: PAD, y1: H - PAD, x2: W - PAD, y2: H - PAD, stroke: '#ced5db' }));
  svg.append(el('line', { x1: PAD, y1: PAD, x2: PAD, y2: H - PAD, stroke: '#ced5db' }));

  for (const p of pts) {
    if (p.c === -1) {
      const g = el('g', {});
      g.append(el('circle', { cx: sx(p.x), cy: sy(p.y), r: 7, fill: 'none', stroke: '#2e31c9', 'stroke-width': 2 }));
      g.append(el('circle', { cx: sx(p.x), cy: sy(p.y), r: 2.5, fill: '#2e31c9' }));
      const t = el('text', { x: sx(p.x) + 12, y: sy(p.y) + 4, fill: '#2e31c9', 'font-size': 10, 'font-family': 'ui-monospace, monospace', 'letter-spacing': '.1em' });
      t.textContent = 'DRAFT';
      g.append(t);
      svg.append(g);
    } else {
      const c = el('circle', { cx: sx(p.x), cy: sy(p.y), r: 4.5, fill: CLUSTER_INK[p.c % 4], 'fill-opacity': .75 });
      const title = el('title', {});
      title.textContent = docs[p.i]?.title || '';
      c.append(title);
      svg.append(c);
    }
  }
  const lx = el('text', { x: W - PAD, y: H - PAD + 18, fill: '#8d97a1', 'font-size': 9, 'text-anchor': 'end', 'font-family': 'ui-monospace, monospace', 'letter-spacing': '.12em' });
  lx.textContent = `PC1 ${(explained[0] * 100).toFixed(0)}% OF VARIANCE`;
  svg.append(lx);
  const ly = el('text', { x: PAD, y: PAD - 12, fill: '#8d97a1', 'font-size': 9, 'font-family': 'ui-monospace, monospace', 'letter-spacing': '.12em' });
  ly.textContent = `PC2 ${(explained[1] * 100).toFixed(0)}%`;
  svg.append(ly);

  if (K > 1) {
    $('legend').innerHTML = Array.from({ length: K }, (_, c) => {
      const members = docs.filter((_, i) => labels[i] === c);
      return `<span><i style="background:${CLUSTER_INK[c % 4]}"></i>Group ${c + 1} · ${members.length} ${members.length === 1 ? 'page' : 'pages'}</span>`;
    }).join('');
  }
}

// project the draft into the corpus PCA space using the corpus's own centring
function projectDraft(Z, rows, draftObj) {
  const d = rows[0].length;
  const mus = [], sds = [];
  for (let j = 0; j < d; j++) {
    const col = rows.map(r => r[j]);
    const m = mean(col);
    const s = Math.sqrt(col.reduce((a, x) => a + (x - m) ** 2, 0) / Math.max(1, col.length - 1)) || 1;
    mus.push(m); sds.push(s);
  }
  const dv = vectorOf(draftObj.metrics).map((v, j) => (v - mus[j]) / sds[j]);
  const zmu = [];
  for (let j = 0; j < d; j++) zmu.push(mean(Z.map(r => r[j])));
  const { loadings } = pca(Z, 2);
  const centred = dv.map((v, j) => v - zmu[j]);
  return loadings.map(c => centred.reduce((s, x, j) => s + x * c[j], 0));
}

/* ── corpus list ────────────────────────────────────────────── */
function renderDocs() {
  if (!docs.length) {
    $('docs').innerHTML = `<div class="empty"><div class="lbl">Empty</div>
      <p class="prose">Save six pages and this tool starts telling you something you didn't already believe.</p></div>`;
    return;
  }
  $('docs').innerHTML = docs.map((d, i) => `
    <div class="doc">
      <div class="t">${escape(d.title)}<small>${escape(d.site || '')} · ${new Date(d.savedAt).toLocaleDateString()}</small></div>
      <div class="n num">${(d.words || 0).toLocaleString()}w</div>
      <div class="cl" style="color:${K > 1 ? CLUSTER_INK[(labels[i] || 0) % 4] : 'var(--ink-3)'}">${mets[i]?._type ? mets[i]._type.toUpperCase().slice(0, 22) : ''}</div>
      <button data-id="${d.id}">Remove</button>
    </div>`).join('');
  $('docs').querySelectorAll('button[data-id]').forEach(b => {
    b.onclick = async () => { await deleteDoc(+b.dataset.id); await refresh(); };
  });
}
const escape = s => (s || '').replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

/* ── wiring ─────────────────────────────────────────────────── */
async function refresh() {
  await load();
  renderMeters($('meters'), mets, draft ? draft.metrics : null);
  $('typeNote').textContent = draft
    ? `your draft reads as ${draft.textType.type.toLowerCase()}`
    : `Biber's six dimensions, z-scored against LOB/London-Lund`;
  renderTable();
  renderClusters();
  renderDocs();
}

$('measure').onclick = async () => {
  const text = $('draft').value.trim();
  if (!text) return;
  const a = analyze(text);
  if (!a) { $('draftMeta').textContent = 'too short'; return; }
  draft = a;
  const flags = [];
  if (a.overused.length) flags.push('overuses ' + a.overused.slice(0, 4).join(' '));
  if (a.underused.length) flags.push('underuses ' + a.underused.slice(0, 4).join(' '));
  const warn = a.nWords < 300 ? 'under 300 words, reading is noisy · ' : '';
  $('draftMeta').textContent = `${a.nWords} words · ${a.nSentences} sentences · ${warn}${flags.join(' · ')}`;
  await refresh();
  $('meters').scrollIntoView({ behavior: 'smooth', block: 'center' });
};

$('clearDraft').onclick = async () => {
  $('draft').value = ''; draft = null; $('draftMeta').textContent = '';
  await refresh();
};

$('wipe').onclick = async () => {
  if (!confirm('Delete every saved page and start over?')) return;
  await clearAll(); draft = null; await refresh();
};

refresh();
