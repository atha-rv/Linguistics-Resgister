chrome.runtime.onMessage.addListener((msg, _sender, respond) => {
  if (msg.type === 'extract') {
    (async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || /^(chrome|edge|about|chrome-extension):/.test(tab.url || '')) {
        respond({ ok: false, error: 'Register can only read ordinary web pages.' });
        return;
      }
      try {
        const [res] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        respond(res?.result || { ok: false, error: 'Nothing came back from the page.' });
      } catch (e) {
        respond({ ok: false, error: String(e.message || e) });
      }
    })();
    return true;
  }
  if (msg.type === 'openDashboard') {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
    respond({ ok: true });
  }
});
