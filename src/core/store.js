// src/core/store.js
// All player-owned data (their own teams) lives only in this browser's
// LocalStorage. The API is Promise-based on purpose: if this ever needs to
// move to IndexedDB for larger data, callers do not need to change.

const KEY = 'myTeams';
const MEMBER_SLOTS = 5;

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (err) {
    console.error('讀取本機隊伍資料失敗，將視為無資料處理。', err);
    return {};
  }
}

function writeAll(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error('寫入本機隊伍資料失敗（可能是瀏覽器儲存空間已滿）。', err);
    return false;
  }
}

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'team_' + Date.now() + '_' + Math.random().toString(16).slice(2);
}

function normalizeMembers(members = []) {
  const arr = members.slice(0, MEMBER_SLOTS);
  while (arr.length < MEMBER_SLOTS) arr.push(null);
  return arr;
}

/** Get every team the player has saved for one stage. */
export async function getTeams(stageId) {
  const all = readAll();
  return all[stageId] ? all[stageId] : [];
}

/** Get every team across every stage, as { stageId, teams[] } entries. */
export async function getAllTeamsGrouped() {
  const all = readAll();
  return Object.keys(all)
    .filter((stageId) => Array.isArray(all[stageId]) && all[stageId].length > 0)
    .map((stageId) => ({ stageId, teams: all[stageId] }));
}

export async function saveTeam(stageId, team) {
  const all = readAll();
  const list = all[stageId] ? all[stageId] : [];
  const normalized = {
    localId: team.localId || uuid(),
    name: (team.name || '未命名隊伍').trim() || '未命名隊伍',
    note: team.note || '',
    members: normalizeMembers(team.members),
  };
  const idx = list.findIndex((t) => t.localId === normalized.localId);
  if (idx >= 0) list[idx] = normalized;
  else list.push(normalized);
  all[stageId] = list;
  const ok = writeAll(all);
  if (!ok) throw new Error('儲存失敗，請確認瀏覽器儲存空間是否已滿。');
  return normalized;
}

export async function deleteTeam(stageId, localId) {
  const all = readAll();
  if (!all[stageId]) return;
  all[stageId] = all[stageId].filter((t) => t.localId !== localId);
  if (all[stageId].length === 0) delete all[stageId];
  writeAll(all);
}

export async function duplicateTeam(stageId, localId) {
  const all = readAll();
  const list = all[stageId] || [];
  const source = list.find((t) => t.localId === localId);
  if (!source) throw new Error('找不到要複製的隊伍。');
  const copy = {
    ...source,
    localId: uuid(),
    name: source.name + ' (複製)',
  };
  list.push(copy);
  all[stageId] = list;
  writeAll(all);
  return copy;
}

export async function exportTeams(stageId = null) {
  const all = readAll();
  const payload = stageId ? { [stageId]: all[stageId] || [] } : all;
  return {
    exportedAt: new Date().toISOString(),
    scope: stageId || 'all',
    data: payload,
  };
}

/**
 * Import a previously exported backup.
 * mode: 'merge' (add/overwrite matching localIds, keep the rest) or
 *       'replace' (wipe target scope then write the imported data).
 */
export async function importTeams(payload, mode = 'merge') {
  if (!payload || typeof payload !== 'object' || !payload.data) {
    throw new Error('檔案格式不正確，無法匯入。');
  }
  const all = readAll();
  for (const [stageId, teams] of Object.entries(payload.data)) {
    if (!Array.isArray(teams)) continue;
    if (mode === 'replace') {
      all[stageId] = teams.map((t) => ({ ...t, members: normalizeMembers(t.members) }));
      continue;
    }
    const existing = all[stageId] || [];
    for (const incoming of teams) {
      const norm = { ...incoming, members: normalizeMembers(incoming.members) };
      const idx = existing.findIndex((t) => t.localId === norm.localId);
      if (idx >= 0) existing[idx] = norm;
      else existing.push(norm);
    }
    all[stageId] = existing;
  }
  const ok = writeAll(all);
  if (!ok) throw new Error('匯入失敗，請確認瀏覽器儲存空間是否已滿。');
  return true;
}

export const TEAM_MEMBER_SLOTS = MEMBER_SLOTS;
