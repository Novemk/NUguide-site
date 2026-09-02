// src/core/dataLoader.js
// Single point of access for every public JSON file. Caches per-path so a
// page that needs the same file from multiple components only fetches once.

const cache = new Map();

/**
 * Resolve a data-relative path (e.g. "data/cards.json") against the
 * location of this module, so pages in sub-folders (e.g. /admin/) still
 * resolve to the project-root /data folder correctly.
 */
const ROOT = new URL('../../', import.meta.url);

/**
 * Normally every JSON/asset path is resolved against this page's own
 * project root (works fine when the admin lives in the same deployment
 * as the public site). When the admin is split into its own separate
 * deployment (e.g. a gated Cloudflare Pages site), it has no local copy
 * of data/*.json or assets/img/* — so admin-src sets
 * window.__PUBLIC_DATA_BASE__ to the public site's own URL once the
 * operator is logged in, and every read here transparently redirects
 * there instead. Front-site pages never set this, so they are unaffected.
 */
function resolveBase() {
  if (typeof window !== 'undefined' && window.__PUBLIC_DATA_BASE__) {
    return window.__PUBLIC_DATA_BASE__;
  }
  return ROOT;
}

function resolvePath(path) {
  if (/^https?:\/\//.test(path)) return path;
  return new URL(path.replace(/^\.?\//, ''), resolveBase()).href;
}

/**
 * Load and cache a JSON file. Pass `fresh: true` to bypass the cache
 * (used by the admin after a publish, so the next read reflects the
 * just-written content instead of a stale in-memory copy).
 */
export async function loadJSON(path, { fresh = false } = {}) {
  const url = resolvePath(path);
  if (!fresh && cache.has(url)) return cache.get(url);

  const res = await fetch(url, { cache: fresh ? 'no-store' : 'default' });
  if (!res.ok) {
    throw new Error(`資料載入失敗：${path}（HTTP ${res.status}）`);
  }
  const json = await res.json();
  cache.set(url, json);
  return json;
}

export function invalidate(path) {
  if (!path) { cache.clear(); return; }
  cache.delete(resolvePath(path));
}

/** Convenience loaders for the fixed set of public data files. */
export const DataSources = {
  characters: 'data/characters.json',
  classes: 'data/classes.json',
  elements: 'data/elements.json',
  rarities: 'data/rarities.json',
  cdRanges: 'data/cd-ranges.json',
  tags: 'data/tags.json',
  cards: 'data/cards.json',
  stages: 'data/stages.json',
  stageTeams: 'data/stage-teams.json',
  filterSchema: 'data/filter-schema.json',
  siteSettings: 'data/site-settings.json',
};

/** Loads every taxonomy file needed to render the filter panel / forms. */
export async function loadAllTaxonomies() {
  const [characters, classes, elements, rarities, cdRanges, tags] = await Promise.all([
    loadJSON(DataSources.characters),
    loadJSON(DataSources.classes),
    loadJSON(DataSources.elements),
    loadJSON(DataSources.rarities),
    loadJSON(DataSources.cdRanges),
    loadJSON(DataSources.tags),
  ]);
  return { characters, classes, elements, rarities, cdRanges, tags };
}

/**
 * Resolve any project-relative asset path (e.g. "assets/img/cards/x.svg")
 * to an absolute URL, regardless of how deep the current page lives
 * (works the same from /cards.html and /admin/cards.html).
 */
export function resolveAsset(path) {
  if (!path) return '';
  if (/^https?:\/\//.test(path) || path.startsWith('data:')) return path;
  return new URL(path.replace(/^\.?\//, ''), resolveBase()).href;
}

export function byId(list, id) {
  return list.find((item) => item.id === id);
}

export function toMap(list) {
  const map = new Map();
  for (const item of list) map.set(item.id, item);
  return map;
}
