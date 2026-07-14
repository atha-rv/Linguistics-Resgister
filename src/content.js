// Injected on demand. Pulls the article body out of the page and drops the chrome.
import { Readability } from '@mozilla/readability';

export function extract() {
  try {
    const clone = document.cloneNode(true);
    const art = new Readability(clone, { charThreshold: 200 }).parse();
    const text = (art?.textContent || document.body.innerText || '')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    return {
      ok: text.split(/\s+/).length >= 60,
      error: 'This page has no article body long enough to measure.',
      title: art?.title || document.title || location.hostname,
      byline: art?.byline || '',
      siteName: art?.siteName || location.hostname,
      url: location.href.split('#')[0],
      text
    };
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) };
  }
}
