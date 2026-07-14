import winkNLP from 'wink-nlp';
import model from 'wink-eng-lite-web-model';
import { biberCounts, zscores, dimensions, nearestTextType, FEATURES } from './biber.js';
import * as st from './stats.js';
import NORMS_TSV from '../data/norms.tsv';

const nlp = winkNLP(model);
const its = nlp.its;

// word -> [concreteness 1..5, Zipf frequency]
const NORM = new Map();
for (const line of NORMS_TSV.split('\n')) {
  const i = line.indexOf('\t'); if (i < 0) continue;
  const j = line.indexOf('\t', i + 1);
  NORM.set(line.slice(0, i), [+line.slice(i + 1, j), +line.slice(j + 1)]);
}

const CONTENT = new Set(['NOUN', 'PROPN', 'VERB', 'ADJ', 'ADV']);

// The metrics that get compared against the corpus. Order fixes the vector layout.
export const METRIC_KEYS = [
  'd1', 'd2', 'd3', 'd4', 'd5', 'd6',
  'sentMean', 'sentSD', 'sentSkew', 'sentAC1', 'pctShort', 'pctLong', 'longestShortRun',
  'mtld', 'mattr',
  'concMean', 'concSD', 'pctAbstract',
  'zipfMean', 'pctRare', 'offNorms',
  'nomzRate', 'passRate', 'beRate', 'modalRate', 'awl', 'commaRate'
];

export const METRIC_LABELS = {
  d1: 'D1 involved \u2192 informational', d2: 'D2 narrative', d3: 'D3 explicit reference',
  d4: 'D4 overt persuasion', d5: 'D5 abstract information', d6: 'D6 on-line elaboration',
  sentMean: 'Sentence length, mean', sentSD: 'Sentence length, SD',
  sentSkew: 'Sentence length, skew', sentAC1: 'Length autocorrelation (lag 1)',
  pctShort: 'Sentences under 8 words, %', pctLong: 'Sentences over 35 words, %',
  longestShortRun: 'Longest run of short sentences',
  mtld: 'MTLD', mattr: 'MATTR (window 50)',
  concMean: 'Concreteness, mean', concSD: 'Concreteness, SD',
  pctAbstract: 'Content words below 2.5 concreteness, %',
  zipfMean: 'Zipf frequency, mean', pctRare: 'Content words below Zipf 3, %',
  offNorms: 'Content words absent from norms, %',
  nomzRate: 'Nominalisations per 100 words', passRate: 'Agentless passives per 100 words',
  beRate: '"Be" as main verb per 100 words', modalRate: 'Modals per 100 words',
  awl: 'Average word length', commaRate: 'Commas per sentence'
};

// Metrics where a higher number means denser, harder, more written-register prose.
export const METRIC_GROUPS = [
  ['Register', ['d1', 'd2', 'd3', 'd4', 'd5', 'd6']],
  ['Rhythm', ['sentMean', 'sentSD', 'sentSkew', 'sentAC1', 'pctShort', 'pctLong', 'longestShortRun', 'commaRate']],
  ['Vocabulary', ['mtld', 'mattr', 'zipfMean', 'pctRare', 'offNorms', 'awl']],
  ['Concreteness', ['concMean', 'concSD', 'pctAbstract']],
  ['Grammar', ['nomzRate', 'passRate', 'beRate', 'modalRate']]
];

export function analyze(text) {
  const doc = nlp.readDoc(text || '');

  const toks = [];
  doc.tokens().each(t => {
    toks.push({ t: t.out(), low: t.out().toLowerCase(), lemma: t.out(its.lemma), upos: t.out(its.pos) });
  });
  if (toks.length < 30) return null;

  // sentence boundaries as [startTokenIdx, endTokenIdx]
  const bounds = [];
  const lengths = [];
  let cursor = 0;
  doc.sentences().each(s => {
    const n = s.tokens().length();
    bounds.push([cursor, cursor + n - 1]);
    let words = 0;
    for (let i = cursor; i < cursor + n; i++) {
      const u = toks[i].upos;
      if (u !== 'PUNCT' && u !== 'SYM' && u !== 'SPACE') words++;
    }
    if (words > 0) lengths.push(words);
    cursor += n;
  });

  const bc = biberCounts(toks, bounds);
  const z = zscores(bc.norm);
  const dims = dimensions(z);

  const words = toks.filter(t => t.isWord);
  const lows = words.map(t => t.lemma || t.low);

  // Concreteness and frequency over content words only.
  const conc = [], zipf = [];
  let contentTotal = 0, off = 0;
  for (const t of words) {
    if (!CONTENT.has(t.upos)) continue;
    contentTotal++;
    const rec = NORM.get(t.low) || NORM.get(t.lemma);
    if (!rec) { off++; continue; }
    conc.push(rec[0]); zipf.push(rec[1]);
  }

  const nSent = lengths.length || 1;
  const commas = toks.filter(t => t.t === ',').length;

  // longest consecutive run of sentences under 8 words
  let run = 0, bestRun = 0;
  for (const l of lengths) { if (l < 8) { run++; bestRun = Math.max(bestRun, run); } else run = 0; }

  const m = {
    ...dims,
    sentMean: st.mean(lengths),
    sentSD: st.sd(lengths),
    sentSkew: st.skew(lengths),
    sentAC1: st.autocorr1(lengths),
    pctShort: 100 * lengths.filter(l => l < 8).length / nSent,
    pctLong: 100 * lengths.filter(l => l > 35).length / nSent,
    longestShortRun: bestRun,
    mtld: st.mtld(lows) ?? 0,
    mattr: st.mattr(lows, 50),
    concMean: st.mean(conc),
    concSD: st.sd(conc),
    pctAbstract: conc.length ? 100 * conc.filter(c => c < 2.5).length / conc.length : 0,
    zipfMean: st.mean(zipf),
    pctRare: zipf.length ? 100 * zipf.filter(v => v < 3).length / zipf.length : 0,
    offNorms: contentTotal ? 100 * off / contentTotal : 0,
    nomzRate: bc.norm.NOMZ,
    passRate: bc.norm.PASS,
    beRate: bc.norm.BEMA,
    modalRate: bc.norm.POMD + bc.norm.NEMD + bc.norm.PRMD,
    awl: bc.norm.AWL,
    commaRate: commas / nSent
  };

  return {
    metrics: m,
    biber: bc.norm,
    z,
    textType: nearestTextType(dims),
    nWords: bc.nWords,
    nSentences: nSent,
    lengths,
    // z-scores more than 2 SD from Biber's register norms: what this text overuses / underuses
    overused: FEATURES.filter(f => z[f] > 2).sort((a, b) => z[b] - z[a]).slice(0, 8),
    underused: FEATURES.filter(f => z[f] < -2).sort((a, b) => z[a] - z[b]).slice(0, 8)
  };
}

export function vectorOf(metrics) { return METRIC_KEYS.map(k => metrics[k] ?? 0); }

// z-score a corpus matrix column-wise; returns [matrix, mus, sds]
export function standardize(rows) {
  const d = rows[0].length;
  const mus = [], sds = [];
  for (let j = 0; j < d; j++) {
    const col = rows.map(r => r[j]);
    mus.push(st.mean(col));
    sds.push(st.sd(col) || 1);
  }
  return [rows.map(r => r.map((v, j) => (v - mus[j]) / sds[j])), mus, sds];
}
