export const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
export const sd = a => {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
};
export function skew(a) {
  if (a.length < 3) return 0;
  const m = mean(a), s = sd(a);
  if (!s) return 0;
  return a.reduce((t, x) => t + ((x - m) / s) ** 3, 0) / a.length;
}
// Lag-1 autocorrelation: does a short sentence deliberately follow a long one,
// or does length wander at random?
export function autocorr1(a) {
  if (a.length < 3) return 0;
  const m = mean(a);
  let num = 0, den = 0;
  for (let i = 0; i < a.length; i++) {
    den += (a[i] - m) ** 2;
    if (i) num += (a[i] - m) * (a[i - 1] - m);
  }
  return den ? num / den : 0;
}
export function quantile(sorted, q) {
  if (!sorted.length) return 0;
  const p = (sorted.length - 1) * q, lo = Math.floor(p), hi = Math.ceil(p);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (p - lo);
}
export function percentileOf(sorted, x) {
  if (!sorted.length) return null;
  let lo = 0, hi = sorted.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid] < x) lo = mid + 1; else hi = mid; }
  return lo / sorted.length;
}

// Measure of Textual Lexical Diversity, bidirectional, ttr floor 0.72 (McCarthy & Jarvis 2010).
export function mtld(tokens, ttrThreshold = 0.72) {
  const one = seq => {
    let factors = 0, types = new Set(), n = 0;
    for (const w of seq) {
      types.add(w); n++;
      const ttr = types.size / n;
      if (ttr <= ttrThreshold) { factors++; types = new Set(); n = 0; }
    }
    if (n > 0) {
      const ttr = types.size / n;
      factors += (1 - ttr) / (1 - ttrThreshold);
    }
    return factors > 0 ? seq.length / factors : seq.length;
  };
  if (tokens.length < 50) return null;
  return (one(tokens) + one([...tokens].reverse())) / 2;
}

// Moving-average type-token ratio (Covington & McFall 2010). Most stable on short texts.
export function mattr(tokens, window = 50) {
  if (tokens.length < window) return tokens.length ? new Set(tokens).size / tokens.length : 0;
  const counts = new Map();
  let sum = 0, windows = 0;
  for (let i = 0; i < tokens.length; i++) {
    counts.set(tokens[i], (counts.get(tokens[i]) || 0) + 1);
    if (i >= window) {
      const out = tokens[i - window], v = counts.get(out) - 1;
      if (v === 0) counts.delete(out); else counts.set(out, v);
    }
    if (i >= window - 1) { sum += counts.size / window; windows++; }
  }
  return sum / windows;
}

// Principal components of a z-scored matrix, via power iteration on the covariance.
export function pca(rows, k = 2) {
  const n = rows.length, d = rows[0]?.length || 0;
  if (n < 3 || !d) return { scores: rows.map(() => new Array(k).fill(0)), loadings: [], explained: [] };
  const mu = new Array(d).fill(0);
  for (const r of rows) for (let j = 0; j < d; j++) mu[j] += r[j] / n;
  const X = rows.map(r => r.map((v, j) => v - mu[j]));

  const cov = Array.from({ length: d }, () => new Array(d).fill(0));
  for (const r of X) for (let a = 0; a < d; a++) for (let b = a; b < d; b++) {
    const v = r[a] * r[b] / (n - 1); cov[a][b] += v; if (a !== b) cov[b][a] += v;
  }
  let total = 0; for (let a = 0; a < d; a++) total += cov[a][a];

  const comps = [], evals = [];
  const M = cov.map(r => [...r]);
  for (let c = 0; c < k; c++) {
    let v = new Array(d).fill(0).map(() => Math.random() - 0.5);
    let lambda = 0;
    for (let it = 0; it < 300; it++) {
      const w = new Array(d).fill(0);
      for (let a = 0; a < d; a++) for (let b = 0; b < d; b++) w[a] += M[a][b] * v[b];
      const norm = Math.hypot(...w) || 1;
      lambda = norm;
      const nv = w.map(x => x / norm);
      let delta = 0; for (let a = 0; a < d; a++) delta += Math.abs(nv[a] - v[a]);
      v = nv;
      if (delta < 1e-9) break;
    }
    comps.push(v); evals.push(lambda);
    for (let a = 0; a < d; a++) for (let b = 0; b < d; b++) M[a][b] -= lambda * v[a] * v[b];
  }
  const scores = X.map(r => comps.map(c => r.reduce((s, x, j) => s + x * c[j], 0)));
  return { scores, loadings: comps, explained: evals.map(e => total ? e / total : 0) };
}

// k-means with k-means++ seeding. Answers: do you have one taste, or three?
export function kmeans(rows, k, iters = 60) {
  const n = rows.length, d = rows[0].length;
  if (n <= k) return { labels: rows.map((_, i) => i), centroids: rows.map(r => [...r]) };
  const dist2 = (a, b) => { let s = 0; for (let i = 0; i < d; i++) s += (a[i] - b[i]) ** 2; return s; };
  const cents = [rows[Math.floor(Math.random() * n)].slice()];
  while (cents.length < k) {
    const dd = rows.map(r => Math.min(...cents.map(c => dist2(r, c))));
    const tot = dd.reduce((a, b) => a + b, 0);
    let x = Math.random() * tot, idx = 0;
    for (let i = 0; i < n; i++) { x -= dd[i]; if (x <= 0) { idx = i; break; } }
    cents.push(rows[idx].slice());
  }
  let labels = new Array(n).fill(0);
  for (let it = 0; it < iters; it++) {
    let moved = false;
    for (let i = 0; i < n; i++) {
      let best = 0, bd = Infinity;
      for (let c = 0; c < k; c++) { const dd = dist2(rows[i], cents[c]); if (dd < bd) { bd = dd; best = c; } }
      if (labels[i] !== best) { labels[i] = best; moved = true; }
    }
    for (let c = 0; c < k; c++) {
      const members = rows.filter((_, i) => labels[i] === c);
      if (!members.length) continue;
      for (let j = 0; j < d; j++) cents[c][j] = mean(members.map(m => m[j]));
    }
    if (!moved) break;
  }
  return { labels, centroids: cents };
}

// Mean silhouette width: how real are the clusters?
export function silhouette(rows, labels, k) {
  const n = rows.length, d = rows[0].length;
  const dist = (a, b) => { let s = 0; for (let i = 0; i < d; i++) s += (a[i] - b[i]) ** 2; return Math.sqrt(s); };
  let total = 0;
  for (let i = 0; i < n; i++) {
    const groups = Array.from({ length: k }, () => []);
    for (let j = 0; j < n; j++) if (i !== j) groups[labels[j]].push(dist(rows[i], rows[j]));
    const a = groups[labels[i]].length ? mean(groups[labels[i]]) : 0;
    let b = Infinity;
    for (let c = 0; c < k; c++) if (c !== labels[i] && groups[c].length) b = Math.min(b, mean(groups[c]));
    if (!isFinite(b)) { total += 0; continue; }
    total += (b - a) / Math.max(a, b);
  }
  return total / n;
}
