// src/modules/cardSort.js

/**
 * Sorts cards by their `sortOrder` field (descending — larger number
 * appears first / higher up the grid). Cards that don't have a
 * `sortOrder` yet (e.g. existing cards from before this feature existed)
 * are placed after all numbered cards, keeping their original relative
 * order — so rolling this out doesn't reshuffle anything until the
 * operator actually assigns numbers.
 *
 * @param {Array} cards
 * @returns {Array} a new sorted array (does not mutate the input)
 */
export function sortCardsByOrder(cards) {
  return cards
    .map((card, index) => ({ card, index }))
    .sort((a, b) => {
      const av = typeof a.card.sortOrder === 'number' ? a.card.sortOrder : -Infinity;
      const bv = typeof b.card.sortOrder === 'number' ? b.card.sortOrder : -Infinity;
      if (av !== bv) return bv - av; // descending
      return a.index - b.index; // stable fallback for ties / unnumbered cards
    })
    .map((entry) => entry.card);
}
