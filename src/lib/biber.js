// Biber (1988) 67 lexico-grammatical features + the six register dimensions.
// Feature definitions, LOB/London-Lund means & SDs, and the dimension formulas are
// ported from Nini's Multidimensional Analysis Tagger (GPL) so the z-scores stay
// comparable to the published register space.
import { tag, BE, HAVE, DO, MODALS, NEG } from './tagset.js';
import LISTS from '../data/biber_lists.json';

const S = o => new Set(o);
const L = {}; for (const k in LISTS) L[k] = S(LISTS[k]);

const FPP1 = S(['i','me','we','us','my','our','myself','ourselves','mine','ours',"i'm","i've","i'd","i'll","we're","we've"]);
const SPP2 = S(['you','your','yourself','yourselves','yours','thou','thee','thy','ye',"you're","you've","you'd","you'll"]);
const TPP3 = S(['he','she','they','him','her','them','his','their','himself','herself','themselves','hers','theirs',"he's","she's","they're","they've"]);
const DEMO = S(['that','this','these','those']);
const SUBJPRO = S(['i','we','he','she','they','you','it']);
const WHW = S(['what','where','when','how','whether','why','whoever','whomever','whichever','wherever','whenever','whatever','however']);
const WPW = S(['who','whom','whose','which']);

export const MEANS = {"VBD":4.01,"PEAS":0.86,"VPRT":7.77,"PLACE":0.31,"TIME":0.52,"FPP1":2.72,"SPP2":0.99,"TPP3":2.99,"PIT":1.03,"DEMP":0.46,"INPR":0.14,"PROD":0.30,"WHQU":0.02,"NOMZ":1.99,"GER":0.7,"NN":18.05,"PASS":0.96,"BYPA":0.08,"BEMA":2.83,"EX":0.22,"THVC":0.33,"THAC":0.03,"WHCL":0.06,"TO":1.49,"PRESP":0.1,"PASTP":0.01,"WZPAST":0.25,"WZPRES":0.16,"TSUB":0.04,"TOBJ":0.08,"WHSUB":0.21,"WHOBJ":0.14,"PIRE":0.07,"SERE":0.01,"CAUS":0.11,"CONC":0.05,"COND":0.25,"OSUB":0.1,"PIN":11.05,"JJ":6.07,"PRED":0.47,"RB":6.56,"TTR":51.1,"AWL":4.5,"CONJ":0.12,"DWNT":0.2,"HDG":0.06,"AMP":0.27,"EMPH":0.63,"DPAR":0.12,"DEMO":0.99,"POMD":0.58,"NEMD":0.21,"PRMD":0.56,"PUBV":0.77,"PRIV":1.80,"SUAV":0.29,"SMP":0.08,"CONT":1.35,"THATD":0.31,"STPR":0.2,"SPIN":0,"SPAU":0.55,"PHC":0.34,"ANDC":0.45,"SYNE":0.17,"XX0":0.85};
export const SDS = {"VBD":3.04,"PEAS":0.52,"VPRT":3.43,"PLACE":0.34,"TIME":0.35,"FPP1":2.61,"SPP2":1.38,"TPP3":2.25,"PIT":0.71,"DEMP":0.48,"INPR":0.20,"PROD":0.35,"WHQU":0.06,"NOMZ":1.44,"GER":0.38,"NN":3.56,"PASS":0.66,"BYPA":0.13,"BEMA":0.95,"EX":0.18,"THVC":0.29,"THAC":0.06,"WHCL":0.1,"TO":0.56,"PRESP":0.17,"PASTP":0.04,"WZPAST":0.31,"WZPRES":0.18,"TSUB":0.08,"TOBJ":0.11,"WHSUB":0.20,"WHOBJ":0.17,"PIRE":0.11,"SERE":0.04,"CAUS":0.17,"CONC":0.08,"COND":0.22,"OSUB":0.11,"PIN":2.54,"JJ":1.88,"PRED":0.26,"RB":1.76,"TTR":5.2,"AWL":0.4,"CONJ":0.16,"DWNT":0.16,"HDG":0.13,"AMP":0.26,"EMPH":0.42,"DPAR":0.23,"DEMO":0.42,"POMD":0.35,"NEMD":0.21,"PRMD":0.42,"PUBV":0.54,"PRIV":1.04,"SUAV":0.31,"SMP":0.1,"CONT":1.86,"THATD":0.41,"STPR":0.27,"SPIN":0.00001,"SPAU":0.25,"PHC":0.27,"ANDC":0.48,"SYNE":0.16,"XX0":0.61};
export const FEATURES = Object.keys(MEANS);

// Biber's eight text types, as centroids in D1..D5.
export const TEXT_TYPES = [
  ['Intimate interpersonal interaction', [45, -1, -6, 1, -4]],
  ['Informational interaction',          [30, -1, -4, 1, -3]],
  ['Scientific exposition',              [-15, -2.5, 4, -2, 9]],
  ['Learned exposition',                 [-20, -2, 5, -3, 2]],
  ['Imaginative narrative',              [5, 7, -4, 1, -2]],
  ['General narrative exposition',       [-10, 2, 0, -1, 0]],
  ['Situated reportage',                 [0, -3, -13, -4.5, -3]],
  ['Involved persuasion',                [5, -2, 2, 4, -1]]
];

export function biberCounts(toks, sentBounds) {
  tag(toks);
  const c = {}; for (const f of FEATURES) c[f] = 0;
  const N = toks.length;
  const at = i => (i >= 0 && i < N ? toks[i] : { low: '', tag: '', upos: '', lemma: '' });
  const words = toks.filter(t => t.isWord);
  const nWords = words.length || 1;

  // sentence start index lookup
  const sentStart = new Set(sentBounds.map(b => b[0]));

  for (let i = 0; i < N; i++) {
    const t = toks[i], w = t.low, g = t.tag, lem = t.lemma;
    const n1 = at(i + 1), n2 = at(i + 2), n3 = at(i + 3), p1 = at(i - 1), p2 = at(i - 2);

    if (g === 'VBD') c.VBD++;
    if (g === 'VBP' || g === 'VBZ') c.VPRT++;
    if (g === 'NOMZ') c.NOMZ++;
    if (g === 'GER') c.GER++;
    if (g === 'NN' || g === 'NNP' || g === 'NOMZ' || g === 'GER') c.NN++;
    if (g === 'IN') c.PIN++;
    if (g === 'JJ') c.JJ++;
    if (g === 'RB') c.RB++;
    if (g === 'TO' && (n1.upos === 'VERB' || n1.upos === 'AUX' || n1.upos === 'ADV')) c.TO++;
    if (g === 'XX0') c.XX0++;

    // pronouns
    if (FPP1.has(w)) c.FPP1++;
    if (SPP2.has(w)) c.SPP2++;
    if (TPP3.has(w)) c.TPP3++;
    if (L.PIT.has(w)) c.PIT++;
    if (L.INPR.has(w)) c.INPR++;
    if (DEMO.has(w)) {
      c.DEMO++;
      // demonstrative PRONOUN: followed by verb/aux/punct/WP/and, not by a noun
      if (n1.upos === 'VERB' || n1.upos === 'AUX' || n1.tag === 'MD' || n1.tag === 'PUNCT' ||
          WPW.has(n1.low) || n1.low === 'and' || n1.tag === 'XX0') c.DEMP++;
    }

    // lexical classes (surface OR lemma, so inflection is covered)
    if (L.PUBV.has(w) || L.PUBV.has(lem)) c.PUBV++;
    if (L.PRIV.has(w) || L.PRIV.has(lem)) c.PRIV++;
    if (L.SUAV.has(w) || L.SUAV.has(lem)) c.SUAV++;
    if (L.SMP.has(w) || L.SMP.has(lem)) c.SMP++;
    if (L.TIME.has(w) && (g === 'RB' || g === 'NN')) c.TIME++;
    if (L.PLACE.has(w) && (g === 'RB' || g === 'NN' || g === 'JJ')) c.PLACE++;
    if (L.AMP.has(w)) c.AMP++;
    if (L.DWNT.has(w)) c.DWNT++;
    if (L.CONJ.has(w)) c.CONJ++;
    if (L.POMD.has(w) && g === 'MD') c.POMD++;
    if (L.NEMD.has(w) && (g === 'MD' || w === 'ought')) c.NEMD++;
    if (L.PRMD.has(w) && (g === 'MD' || w === "'ll" || w === "'d")) c.PRMD++;
    if (w === 'because') c.CAUS++;
    if (L.CONC.has(w)) c.CONC++;
    if (L.COND.has(w) && g !== 'NN') c.COND++;
    if (L.OSUB.has(w) && (g === 'SC' || g === 'IN' || g === 'RB')) c.OSUB++;

    // conjuncts: multiword
    if ((w === 'in' && n1.low === 'comparison') || (w === 'in' && n1.low === 'contrast') ||
        (w === 'by' && (n1.low === 'contrast' || n1.low === 'comparison')) ||
        (w === 'on' && n1.low === 'the' && n2.low === 'contrary') ||
        (w === 'on' && n1.low === 'the' && n2.low === 'other' && n3.low === 'hand') ||
        (w === 'in' && n1.low === 'any' && (n2.low === 'event' || n2.low === 'case')) ||
        (w === 'for' && (n1.low === 'example' || n1.low === 'instance')) ||
        (w === 'in' && n1.low === 'conclusion') || (w === 'in' && n1.low === 'sum') ||
        (w === 'that' && n1.low === 'is')) c.CONJ++;

    // emphatics
    if (L.EMPHW.has(w)) c.EMPH++;
    if (w === 'real' && n1.tag === 'JJ') c.EMPH++;
    if (w === 'so' && n1.tag === 'JJ') c.EMPH++;
    if (DO.has(w) && (n1.upos === 'VERB')) c.EMPH++;
    if (w === 'for' && n1.low === 'sure') c.EMPH++;
    if (w === 'a' && n1.low === 'lot') c.EMPH++;
    if (w === 'such' && n1.low === 'a') c.EMPH++;

    // hedges
    if (w === 'maybe') c.HDG++;
    if (w === 'at' && n1.low === 'about') c.HDG++;
    if (w === 'something' && n1.low === 'like') c.HDG++;
    if (w === 'more' && n1.low === 'or' && n2.low === 'less') c.HDG++;
    if ((w === 'almost' || w === 'sort' || w === 'kind') && n1.low === 'of') c.HDG++;

    // discourse particles: sentence-initial well/now/anyhow/anyways
    if (L.DPAR.has(w) && sentStart.has(i)) c.DPAR++;

    // pro-verb do: do not followed by a verb and not a question/negation auxiliary
    if (DO.has(w) && n1.upos !== 'VERB' && n1.tag !== 'XX0' && n1.tag !== 'RB' && !SUBJPRO.has(n1.low)) c.PROD++;

    // wh-questions: wh word at clause start followed by aux/modal
    if ((WHW.has(w) || WPW.has(w)) && sentStart.has(i) &&
        (n1.tag === 'MD' || BE.has(n1.low) || HAVE.has(n1.low) || DO.has(n1.low))) c.WHQU++;

    // existential there
    if (w === 'there' && (BE.has(n1.low) || n1.tag === 'MD')) c.EX++;

    // BE as main verb: be followed by DET/PRON/ADJ/prep/adverb (not a participle/verb)
    if (BE.has(w) && (t.upos === 'AUX' || t.upos === 'VERB')) {
      if (n1.tag === 'DT' || n1.tag === 'PRP' || n1.tag === 'JJ' || n1.tag === 'IN' ||
          n1.tag === 'NN' || n1.tag === 'NNP' || n1.tag === 'NOMZ' || n1.tag === 'PUNCT') c.BEMA++;
    }

    // predicative adjective: BE (+adv) + JJ not followed by JJ/NN
    if (BE.has(w)) {
      if (n1.tag === 'JJ' && n2.tag !== 'JJ' && n2.tag !== 'NN' && n2.tag !== 'NNP') c.PRED++;
      else if ((n1.tag === 'RB' || n1.tag === 'XX0') && n2.tag === 'JJ' && n3.tag !== 'JJ' && n3.tag !== 'NN') c.PRED++;
    }

    // perfect aspect: have + (adv/neg/pronoun)* + VBN
    if (HAVE.has(w)) {
      if (n1.tag === 'VBN') c.PEAS++;
      else if ((n1.tag === 'RB' || n1.tag === 'XX0' || n1.tag === 'PRP') && n2.tag === 'VBN') c.PEAS++;
      else if (n1.tag === 'RB' && n2.tag === 'RB' && n3.tag === 'VBN') c.PEAS++;
    }

    // passives
    if (g === 'VBN') {
      let auxBe = false;
      for (let k = i - 1, h = 0; k >= 0 && h < 3; k--, h++) {
        const p = toks[k];
        if (p.tag === 'RB' || p.tag === 'XX0') continue;
        if (BE.has(p.low) || p.lemma === 'be' || p.lemma === 'get') auxBe = true;
        break;
      }
      if (auxBe) { if (n1.low === 'by') c.BYPA++; else c.PASS++; }
    }

    // that-complements
    if (w === 'that') {
      const vb = p1.upos === 'VERB' || p1.upos === 'AUX';
      if (vb && (L.PUBV.has(p1.lemma) || L.PRIV.has(p1.lemma) || L.SUAV.has(p1.lemma) || L.SMP.has(p1.lemma))) c.THVC++;
      else if (vb) c.THVC++;
      if (p1.tag === 'JJ' && (BE.has(p2.low))) c.THAC++;
      // that-relatives
      if (p1.tag === 'NN' || p1.tag === 'NOMZ' || p1.tag === 'GER' || p1.tag === 'NNP') {
        if (n1.upos === 'VERB' || n1.upos === 'AUX' || n1.tag === 'MD' || n1.tag === 'RB') c.TSUB++;
        else if (n1.tag === 'DT' || n1.tag === 'PRP' || n1.tag === 'NN' || n1.tag === 'NNP') c.TOBJ++;
      }
    }

    // wh-relatives and wh-clauses
    if (WPW.has(w) || WHW.has(w)) {
      const nounBefore = p1.tag === 'NN' || p1.tag === 'NNP' || p1.tag === 'NOMZ' || p1.tag === 'GER';
      const verbBefore = p1.upos === 'VERB' || p1.upos === 'AUX';
      if (nounBefore) {
        if (n1.upos === 'VERB' || n1.upos === 'AUX' || n1.tag === 'MD' || n1.tag === 'RB') c.WHSUB++;
        else c.WHOBJ++;
      } else if (verbBefore && (L.PUBV.has(p1.lemma) || L.PRIV.has(p1.lemma) || L.SUAV.has(p1.lemma))) c.WHCL++;
      if (p1.tag === 'IN' && WPW.has(w)) c.PIRE++;                          // pied piping: prep + wh
      if (p1.tag === 'PUNCT' && p1.low === ',' && w === 'which') c.SERE++;  // sentence relative
    }

    // participial clauses
    if (g === 'VBG' && (sentStart.has(i) || (p1.tag === 'PUNCT' && p1.low === ','))) c.PRESP++;
    if (g === 'VBN' && (sentStart.has(i) || (p1.tag === 'PUNCT' && p1.low === ',')) &&
        (n1.tag === 'IN' || n1.tag === 'RB' || n1.tag === 'PUNCT')) c.PASTP++;

    // WHIZ deletions: NOUN + VBN + (prep) ; NOUN + VBG
    if ((p1.tag === 'NN' || p1.tag === 'NOMZ' || p1.tag === 'NNP') && g === 'VBN' &&
        (n1.tag === 'IN' || n1.tag === 'RB')) c.WZPAST++;
    if ((p1.tag === 'NN' || p1.tag === 'NOMZ' || p1.tag === 'NNP') && g === 'VBG') c.WZPRES++;

    // contractions
    if (/^'(s|m|re|ve|ll|d)$/.test(w) || w === "n't") c.CONT++;
    if (/[a-z]'(s|m|re|ve|ll|d)$/.test(w) || /n't$/.test(w)) c.CONT++;

    // subordinator-that deletion: [PUBV/PRIV/SUAV] + demonstrative/subject pronoun
    if ((L.PUBV.has(lem) || L.PRIV.has(lem) || L.SUAV.has(lem)) && (t.upos === 'VERB') &&
        (SUBJPRO.has(n1.low) || DEMO.has(n1.low)) && n2.low !== 'that') {
      if (n1.low !== 'it' || n2.upos === 'VERB' || n2.upos === 'AUX') c.THATD++;
    }

    // stranded preposition
    if (g === 'IN' && (n1.tag === 'PUNCT' || i === N - 1)) c.STPR++;

    // split infinitive / split auxiliary
    if (g === 'TO' && (n1.tag === 'RB' || L.EMPHW.has(n1.low)) && (n2.upos === 'VERB' || (n2.tag === 'RB' && n3.upos === 'VERB'))) c.SPIN++;
    if ((g === 'MD' || BE.has(w) || HAVE.has(w) || DO.has(w)) &&
        (n1.tag === 'RB' || n1.tag === 'XX0') && (n2.upos === 'VERB' || (n2.tag === 'RB' && n3.upos === 'VERB'))) c.SPAU++;

    // phrasal coordination: and joining two same-POS non-clausal items
    if (w === 'and' && ((p1.tag === 'NN' && n1.tag === 'NN') || (p1.tag === 'JJ' && n1.tag === 'JJ') ||
        (p1.tag === 'RB' && n1.tag === 'RB') || (p1.upos === 'VERB' && n1.upos === 'VERB'))) c.PHC++;

    // independent clause coordination
    if (w === 'and' && (sentStart.has(i) || p1.low === ',' ||
        SUBJPRO.has(n1.low) || DEMO.has(n1.low) || n1.tag === 'EX' ||
        WPW.has(n1.low) || WHW.has(n1.low) || n1.low === 'because' || n1.low === 'although' ||
        n1.tag === 'DPAR' || L.CONJ.has(n1.low) || L.OSUB.has(n1.low))) c.ANDC++;

    // synthetic negation
    if (w === 'no' && (n1.tag === 'JJ' || n1.tag === 'NN' || n1.tag === 'NOMZ')) c.SYNE++;
    if (w === 'neither' || w === 'nor') c.SYNE++;
  }

  // normalise per 100 words
  const per100 = {};
  for (const f of FEATURES) per100[f] = (c[f] * 100) / nWords;

  // AWL: mean letters per word
  per100.AWL = words.reduce((a, t) => a + t.t.replace(/[^a-zA-Z]/g, '').length, 0) / nWords;

  // TTR: types in the first 400 tokens, as a percentage
  const first = words.slice(0, 400).map(t => t.low);
  per100.TTR = first.length >= 200 ? (new Set(first).size / first.length) * 100 : MEANS.TTR;

  return { raw: c, norm: per100, nWords };
}

export function zscores(norm) {
  const z = {};
  for (const f of FEATURES) z[f] = (norm[f] - MEANS[f]) / SDS[f];
  return z;
}

export function dimensions(z) {
  const d1 = (z.PRIV + z.THATD + z.CONT + z.VPRT + z.SPP2 + z.PROD + z.XX0 + z.DEMP + z.EMPH +
              z.FPP1 + z.PIT + z.BEMA + z.CAUS + z.DPAR + z.INPR + z.AMP + z.POMD + z.ANDC + z.STPR)
           - (z.NN + z.AWL + z.PIN + z.TTR + z.JJ);
  const d2 = z.VBD + z.TPP3 + z.PEAS + z.PUBV + z.SYNE + z.PRESP;
  const d3 = (z.WHOBJ + z.WHSUB + z.PHC + z.NOMZ) - (z.TIME + z.PLACE + z.RB);
  const d4 = z.TO + z.PRMD + z.SUAV + z.COND + z.NEMD + z.SPAU;
  const d5 = z.CONJ + z.PASS + z.WZPAST + z.OSUB;
  const d6 = z.THVC + z.DEMO;
  return { d1, d2, d3, d4, d5, d6 };
}

export function nearestTextType(d) {
  const v = [d.d1, d.d2, d.d3, d.d4, d.d5];
  let best = null, bd = Infinity;
  for (const [name, c] of TEXT_TYPES) {
    let s = 0; for (let i = 0; i < 5; i++) s += (v[i] - c[i]) ** 2;
    const dist = Math.sqrt(s);
    if (dist < bd) { bd = dist; best = name; }
  }
  return { type: best, distance: bd };
}

export const DIM_LABELS = {
  d1: ['Informational', 'Involved'],
  d2: ['Non-narrative', 'Narrative'],
  d3: ['Situation-dependent', 'Explicit reference'],
  d4: ['Neutral', 'Overt persuasion'],
  d5: ['Non-abstract', 'Abstract'],
  d6: ['Edited', 'On-line elaboration']
};
