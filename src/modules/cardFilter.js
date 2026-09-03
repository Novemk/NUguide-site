// src/modules/cardFilter.js
// Pure functions only — no DOM access — so this logic is reused unchanged
// by the player-facing filter panel, the card database page, and the
// admin's card picker.

/**
 * @typedef {Object} FilterState
 * key = filter-schema.json "field" name, value = array of selected ids.
 * An empty array for a field means "no restriction on this field".
 */

export function createEmptyFilterState(schema) {
  const state = {};
  for (const group of schema) state[group.field] = [];
  return state;
}

function matchesRange(cardValue, selectedRangeIds, cdRanges) {
  if (selectedRangeIds.length === 0) return true;
  return selectedRangeIds.some((rangeId) => {
    const range = cdRanges.find((r) => r.id === rangeId);
    if (!range) return false;
    return cardValue >= range.min && cardValue <= range.max;
  });
}

function matchesSingleValue(cardValue, selectedIds) {
  if (selectedIds.length === 0) return true;
  return selectedIds.includes(cardValue);
}

function matchesArrayIntersection(cardValues, selectedIds) {
  if (selectedIds.length === 0) return true;
  if (!Array.isArray(cardValues)) return false;
  // AND, not OR — a card must have every selected tag, not just one of
  // them. Only 技能效果 (filter-schema.json's "icon-multi" optionType)
  // goes through this function; every other field (rarity/class/
  // element/character/cd) uses matchesSingleValue/matchesRange above,
  // untouched by this change.
  return selectedIds.every((id) => cardValues.includes(id));
}

/**
 * @param {Array} cards - full card list from cards.json
 * @param {FilterState} filterState
 * @param {Array} schema - filter-schema.json (need cardField + optionType)
 * @param {Array} cdRanges - cd-ranges.json, only needed for the "range" field
 */
export function filterCards(cards, filterState, schema, cdRanges) {
  return cards.filter((card) => {
    for (const group of schema) {
      const selected = filterState[group.field] || [];
      const cardValue = card[group.cardField];
      let ok;
      if (group.optionType === 'range') {
        ok = matchesRange(cardValue, selected, cdRanges);
      } else if (group.optionType === 'icon-multi') {
        ok = matchesArrayIntersection(cardValue, selected);
      } else {
        ok = matchesSingleValue(cardValue, selected);
      }
      if (!ok) return false;
    }
    return true;
  });
}

/** Toggle one option id within one filter field. Returns a new state object. */
export function toggleFilterOption(filterState, field, optionId) {
  const current = filterState[field] || [];
  const next = current.includes(optionId)
    ? current.filter((id) => id !== optionId)
    : [...current, optionId];
  return { ...filterState, [field]: next };
}

export function countActiveFilters(filterState) {
  return Object.values(filterState).reduce((sum, arr) => sum + arr.length, 0);
}
