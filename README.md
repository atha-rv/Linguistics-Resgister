# Register

A Chrome extension that keeps a corpus of writing you like and tells you where your drafts sit inside it.

Everything runs client-side. Nothing leaves the browser.

---

## Install

1. `chrome://extensions` → enable **Developer mode**
2. **Load unpacked** → select the `dist/` folder

Loading unpacked sidesteps Chrome Web Store review entirely, which matters: extensions that ship ONNX/WASM have been rejected for "including remotely hosted code in a Manifest V3 item." Nothing here needs the store.

## Rebuild

```
npm install
node build.mjs
```

---

## The design rule

**The corpus stores text, never metric vectors.** Metrics churn. If you save the vector and later invent a better measure, the corpus is dead. Analysis is a *view*, recomputed on demand and cached against an engine version. Bump `ENGINE` in `src/lib/db.js` and every reading is recomputed from source.

---

## What it measures

### Register (Biber 1988)

Six dimensions, computed from 67 lexico-grammatical features. Feature definitions, word lists, LOB/London-Lund means and SDs, and the dimension formulas are ported from Andrea Nini's Multidimensional Analysis Tagger, so scores are comparable to the published register space.

| | Negative pole | Positive pole |
|---|---|---|
| D1 | Informational production | Involved production |
| D2 | Non-narrative | Narrative concerns |
| D3 | Situation-dependent reference | Explicit reference |
| D4 | Neutral exposition | Overt persuasion |
| D5 | Non-abstract | Abstract information |
| D6 | Edited | On-line informational elaboration |

Each text is also snapped to its nearest of Biber's eight text types (Learned exposition, Imaginative narrative, Intimate interpersonal interaction, and so on).

### Rhythm
Sentence length mean, SD, skew, **lag-1 autocorrelation** (does a short sentence deliberately follow a long one, or does length wander at random?), longest consecutive run of sentences under eight words, percentage over 35, commas per sentence.

### Vocabulary
**MTLD** (bidirectional, TTR floor 0.72) and **MATTR** (window 50). Both chosen because they are the only diversity indices that hold steady across text length; plain TTR is worthless and is not computed. Plus mean Zipf frequency, percentage of content words below Zipf 3, percentage absent from the norms entirely, and average word length.

### Concreteness
Mean and SD of Brysbaert/Warriner/Kuperman concreteness over content words; percentage of content words below 2.5 on the 1–5 scale.

### Grammar
Nominalisation rate, agentless passive rate, *be* as main verb, modal rate.

### Taste
k-means over all 27 standardised metrics, with k chosen by silhouette. If the silhouette is under 0.25 the tool says so and refuses to split, rather than inventing groups. A PCA scatter plots the corpus with your draft projected into the same space.

---

## What it deliberately does not measure

**Cohesion.** Connective density, lexical overlap, LSA sentence-to-sentence similarity. Crossley and McNamara found that cohesion is *not* the feature that discriminates high-proficiency from low-proficiency text, and that expert raters weight coherence over cohesion, with high-knowledge readers apparently benefiting from *lower* cohesion. Tracking it as a quality target would optimise for the wrong thing. Word-level properties (frequency, concreteness, diversity) are what actually predicted expert essay grades, and those are what this tool tracks.

---

## Honest limits

- **POS tagging is Universal, not Penn.** wink-nlp gives UPOS plus lemma; tense, participles and contractions are reconstructed in `tagset.js` from morphology plus a ~140-verb irregular table. Around 45 of the 67 Biber features are exact; the clause-level ones (WHIZ deletions, pied-piping, that-relatives, subordinator-that deletion) are pattern approximations. Directionally right, not publication-grade.
- **No dependency parser.** Mean dependency distance would be the best single proxy for syntactic memory load, and there is no credible JS dependency parser. It is not implemented.
- **No surprisal tier yet.** Uniform Information Density (variance of per-token surprisal) is the sharpest available measure of where a reader stutters. It needs distilgpt2 through transformers.js in an offscreen document. The manifest already carries `wasm-unsafe-eval` for it. Not wired.
- **Below 300 words the reading is noisy.** The UI says so when it happens. Biber's centroids live in a five-dimensional space and short texts bounce around in it.
- **Norms cover 37,058 lemmas.** Words outside that list are reported as `offNorms` rather than silently dropped, because a high off-norms rate is itself a signal.

---

## Provenance

- Biber feature set, word lists, means/SDs, dimension formulas, text-type centroids: Nini's Multidimensional Analysis Tagger (GPL). Biber, D. (1988), *Variation across Speech and Writing*.
- Concreteness and SUBTLEX-US frequency counts: Brysbaert, Warriner & Kuperman (2014), 37,058 lemmas. Zipf computed as log10(count per billion) against SUBTLEX-US's 51M-word corpus.
- MTLD: McCarthy & Jarvis (2010). MATTR: Covington & McFall (2010).
- Article extraction: `@mozilla/readability`. NLP: `wink-nlp` + `wink-eng-lite-web-model` (MIT).

---

## Emulating a style

Your writing rules currently assert a mean sentence length of 16–18 words and an SD of 6–8. Those numbers are invented. Save two hundred pages you actually admire and every threshold becomes a percentile against writers you demonstrably like — and you find out whether you have one taste or three.

The workflow is: build a corpus of the writing you're chasing — someone else's, or your own best back-catalogue if the goal is staying consistent with yourself — write the draft, then look at where it lands on the same 27 metrics, in standard deviations from that corpus.

A z-score is not a verdict, it's a coordinate. A draft that comes back +3 SD on `pctShort` and −2 SD on `pctAbstract` against the corpus gives two testable edits: cut short sentences, reach for more abstract nominal phrasing. That's a sharper note than "this doesn't sound like them." And because register, rhythm, vocabulary, concreteness, and grammar move mostly independently, a draft can nail sentence rhythm and still read wrong on nominalisation rate — style-by-ear collapses those into one vague impression, style-by-dimension tells you which one is off.

It also catches you chasing something incoherent. Dump two hundred pages into the corpus and if the k-means step (see Taste, above) refuses to split above a silhouette of 0.25, that's the tool telling you the source material doesn't cluster: there isn't one style in there to imitate, there are several, and matching your draft to the pooled average of all of them will read like none of them.
