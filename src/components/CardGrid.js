// src/components/CardGrid.js
import { renderCardButton } from './CardButton.js';

/**
 * @param {HTMLElement} container - element to render into (cleared first)
 * @param {Array} cards
 * @param {Object} maps - { rarityMap, elementMap, classMap }
 * @param {Object} [opts]
 * @param {(card:Object) => void} [opts.onCardClick]
 * @param {(card:Object) => void} [opts.onInfoClick] - see CardButton.js; adds
 *   a hover info button to every card that opens 卡片資訊 without selecting it
 * @param {(card:Object) => boolean} [opts.isSelected]
 * @param {(card:Object) => boolean} [opts.isDisabled] - see CardButton.js's
 *   opts.disabled — cards this returns true for are dimmed and unclickable
 * @param {string} [opts.emptyTitle]
 * @param {string} [opts.emptyBody]
 * @param {boolean} [opts.compact] - smaller minimum tile size (see
 *   .card-grid--compact in components.css) — used by CardPicker so more
 *   cards fit per row in the narrower modal than on the full 卡片資料庫 page
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
  grid.className = 'card-grid' + (opts.compact ? ' card-grid--compact' : '');
  for (const card of cards) {
    const selected = opts.isSelected ? opts.isSelected(card) : false;
    const disabled = opts.isDisabled ? opts.isDisabled(card) : false;
    grid.appendChild(renderCardButton(card, maps, { selected, disabled, onClick: opts.onCardClick, onInfoClick: opts.onInfoClick }));
  }
  container.appendChild(grid);
}
