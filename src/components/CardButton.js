// src/components/CardButton.js
import { resolveAsset } from '../core/dataLoader.js';
import { renderCardFace } from './CardFace.js';

/**
 * Renders one card thumbnail button.
 * @param {Object} card
 * @param {Object} maps
 * @param {Map} maps.rarityMap - id -> rarity object
 * @param {Map} [maps.elementMap] - id -> element object (for the top-left badge)
 * @param {Map} [maps.classMap] - id -> class/定位 object (for the top-right badge)
 * @param {Object} [opts]
 * @param {boolean} [opts.selected]
 * @param {(card:Object) => void} [opts.onClick]
 */
export function renderCardButton(card, maps, opts = {}) {
  const { rarityMap, elementMap, classMap } = maps;
  const rarity = rarityMap.get(card.rarityId);
  const element = elementMap ? elementMap.get(card.elementId) : null;
  const cls = classMap ? classMap.get(card.classId) : null;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'card-btn' + (opts.selected ? ' selected' : '');
  btn.setAttribute('aria-label', card.name);
  btn.dataset.cardId = card.id;

  const face = renderCardFace({
    imageSrc: resolveAsset(card.image),
    imageAlt: card.name,
    rarity,
    element,
    cls,
  });
  btn.appendChild(face);

  if (opts.onClick) btn.addEventListener('click', () => opts.onClick(card));
  return btn;
}
