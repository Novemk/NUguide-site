// src/components/CardGrid.js
import { renderCardButton } from './CardButton.js';

/**
 * @param {HTMLElement} container - element to render into (cleared first)
 * @param {Array} cards
 * @param {Object} maps - { rarityMap, elementMap, classMap }
 * @param {Object} [opts]
 * @param {(card:Object) => void} [opts.onCardClick]
 * @param {(card:Object) => boolean} [opts.isSelected]
 * @param {string} [opts.emptyTitle]
 * @param {string} [opts.emptyBody]
 */
export function renderCardGrid(container, cards, maps, opts = {}) {
  container.innerHTML = '';
  if (cards.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `<h3>${opts.emptyTitle || '沒有符合條件的卡片'}</h3><p>${opts.emptyBody || '請試著減少一些篩選條件。'}</p>`;
    container.appendChild(empty);
    return;
  }
  const grid = document.createElement('div');
  grid.className = 'card-grid';
  for (const card of cards) {
    const selected = opts.isSelected ? opts.isSelected(card) : false;
    grid.appendChild(renderCardButton(card, maps, { selected, onClick: opts.onCardClick }));
  }
  container.appendChild(grid);
}
