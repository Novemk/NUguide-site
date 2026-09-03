// src/core/tagGroups.js
// Display order + Chinese labels for tags.json's "group" field. Shared by
// genericTaxonomyAdmin.js (Tag 管理 sidebar list) and fieldSelectors.js
// (the 技能 Tag 可複選 picker used when editing a stage's 推薦能力), so
// both places group/order tags identically instead of drifting apart.
export const TAG_GROUP_ORDER = [
  'damage',
  'self_dmg_up',
  'enemy_dmg_up',
  'survival',
  'control',
  'immune',
  'mechanic',
];

export const TAG_GROUP_LABELS = {
  damage: '傷害類型',
  self_dmg_up: '我方增傷',
  enemy_dmg_up: '敵方增傷',
  survival: '生存/治療',
  control: '異常/控制',
  immune: '免疫能力',
  mechanic: '機制/特殊',
};

// The 我方增傷 group specifically reads better as two aligned rows — 我方
// (team-wide) variants on top, 自身 (this card only) variants below, same
// damage-type lined up in the same column — rather than one flat grid.
// Matched purely by stripping the "我方"/"自身" prefix and pairing on
// whatever's left ("必殺傷害增加", "普攻傷害增加", …), so adding a new
// paired tag later just works without touching this function.
export const SELF_TEAM_SPLIT_GROUP = 'self_dmg_up';

// 生存/治療 group: the "-CD" series (labels ending in "-CD") should
// always sit on their own row below the rest of that group's tags,
// rather than just naturally wrapping there whenever the window happens
// to be narrow enough.
export const CD_SPLIT_GROUP = 'survival';

/**
 * @param {Array<{label:string}>} items - already sorted (by sortOrder)
 * @returns {{ mainRow: Array<Object>, cdRow: Array<Object> }}
 */
export function splitCdRow(items) {
  const mainRow = [];
  const cdRow = [];
  for (const item of items) {
    if (item.label.endsWith('-CD')) cdRow.push(item);
    else mainRow.push(item);
  }
  return { mainRow, cdRow };
}

/**
 * @param {Array<{label:string}>} items - already sorted (by sortOrder)
 * @returns {{ teamRow: Array<Object|null>, ownRow: Array<Object|null>, leftover: Array<Object> }}
 *   teamRow[i] and ownRow[i] are the same damage-type paired up; either
 *   can be null (rendered as an empty placeholder) if only one side has
 *   a tag for that type. Anything not prefixed 我方/自身 lands in leftover.
 */
export function splitTeamOwnRows(items) {
  const teamBySuffix = new Map();
  const ownBySuffix = new Map();
  const leftover = [];
  for (const item of items) {
    if (item.label.startsWith('我方')) teamBySuffix.set(item.label.slice(2), item);
    else if (item.label.startsWith('自身')) ownBySuffix.set(item.label.slice(2), item);
    else leftover.push(item);
  }
  const suffixOrder = [];
  for (const suffix of teamBySuffix.keys()) if (!suffixOrder.includes(suffix)) suffixOrder.push(suffix);
  for (const suffix of ownBySuffix.keys()) if (!suffixOrder.includes(suffix)) suffixOrder.push(suffix);

  const teamRow = suffixOrder.map((s) => teamBySuffix.get(s) || null);
  const ownRow = suffixOrder.map((s) => ownBySuffix.get(s) || null);
  return { teamRow, ownRow, leftover };
}

/**
 * Groups a flat list of tags (or any items with a `.group` field) into
 * TAG_GROUP_ORDER's buckets, each already sorted by sortOrder. Items
 * whose group isn't in TAG_GROUP_ORDER land in a trailing "其他" bucket
 * instead of silently disappearing — matters for tags created before
 * this grouping existed, or with a typo'd group value.
 * @param {Array<{group?:string, sortOrder?:number}>} items
 * @returns {Array<{groupId:string, label:string, items:Array}>}
 */
export function groupTags(items) {
  const byGroup = new Map();
  for (const item of items) {
    const key = item.group && TAG_GROUP_LABELS[item.group] ? item.group : '__other__';
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key).push(item);
  }
  const result = [];
  for (const groupId of TAG_GROUP_ORDER) {
    if (byGroup.has(groupId)) {
      result.push({ groupId, label: TAG_GROUP_LABELS[groupId], items: byGroup.get(groupId) });
    }
  }
  if (byGroup.has('__other__')) {
    result.push({ groupId: '__other__', label: '其他', items: byGroup.get('__other__') });
  }
  return result;
}
