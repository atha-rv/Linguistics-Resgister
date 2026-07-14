import { openDB } from 'idb';

// The corpus stores TEXT, never metric vectors. Metrics change; the text is the asset.
// ENGINE is bumped whenever analyze.js changes, which invalidates the cache and nothing else.
export const ENGINE = 3;

const dbp = openDB('register', 1, {
  upgrade(db) {
    const s = db.createObjectStore('docs', { keyPath: 'id', autoIncrement: true });
    s.createIndex('url', 'url', { unique: false });
    s.createIndex('savedAt', 'savedAt');
    db.createObjectStore('cache', { keyPath: 'key' });
  }
});

export async function saveDoc(doc) {
  const db = await dbp;
  const existing = await db.getAllFromIndex('docs', 'url', doc.url);
  if (existing.length) {
    const merged = { ...existing[0], ...doc, id: existing[0].id, savedAt: Date.now() };
    await db.put('docs', merged);
    return { id: merged.id, replaced: true };
  }
  const id = await db.add('docs', { ...doc, savedAt: Date.now() });
  return { id, replaced: false };
}

export async function allDocs() {
  const db = await dbp;
  const rows = await db.getAll('docs');
  return rows.sort((a, b) => b.savedAt - a.savedAt);
}

export async function deleteDoc(id) { (await dbp).delete('docs', id); }

export async function getCached(id) {
  const db = await dbp;
  const hit = await db.get('cache', `${id}:${ENGINE}`);
  return hit ? hit.value : null;
}

export async function setCached(id, value) {
  const db = await dbp;
  await db.put('cache', { key: `${id}:${ENGINE}`, value });
}

export async function clearAll() {
  const db = await dbp;
  await db.clear('docs'); await db.clear('cache');
}
