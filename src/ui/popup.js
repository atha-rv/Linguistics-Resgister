import { analyze } from '../lib/analyze.js';
import { saveDoc, allDocs, getCached, setCached } from '../lib/db.js';
import { renderMeters } from './meters.js';

const $ = id => document.getElementById(id);
let page = null, result = null;

const send = msg => new Promise(r => chrome.runtime.sendMessage(msg, r));

async function corpusDims() {
  const docs = await allDocs();
  const out = [];
  for (const d of docs) {
    let c = await getCached(d.id);
    if (!c) { const a = analyze(d.text); if (!a) continue; c = a.metrics; await setCached(d.id, c); }
    out.push(c);
  }
  return out;
}

async function refreshCount() {
  const n = (await allDocs()).length;
  $('count').textContent = n + (n === 1 ? ' page' : ' pages');
}

$('open').onclick = () => send({ type: 'openDashboard' });

$('save').onclick = async () => {
  $('save').disabled = true;
  const { replaced } = await saveDoc({
    url: page.url, title: page.title, byline: page.byline,
    site: page.siteName, text: page.text, words: result.nWords
  });
  $('status').textContent = replaced ? 'Updated. Already in the corpus.' : 'Saved.';
  await refreshCount();
  const dims = await corpusDims();
  renderMeters($('mini'), dims, result.metrics, false);
};

(async () => {
  await refreshCount();
  const res = await send({ type: 'extract' });
  if (!res?.ok) {
    $('title').textContent = 'Nothing to read here';
    $('status').textContent = res?.error || 'This page has no article body.';
    $('status').className = 'status err';
    return;
  }
  page = res;
  result = analyze(res.text);
  $('title').textContent = res.title;
  if (!result) {
    $('meta').textContent = 'Too short to measure.';
    return;
  }
  const warn = result.nWords < 300 ? ' · short, reading is noisy' : '';
  $('meta').textContent = `${res.siteName} · ${result.nWords.toLocaleString()} words · ${result.nSentences} sentences · reads as ${result.textType.type.toLowerCase()}${warn}`;
  $('save').disabled = false;

  const dims = await corpusDims();
  $('mini').hidden = false;
  renderMeters($('mini'), dims, result.metrics, false);
})();
