// src/components/CardButton.js
import { resolveAsset } from '../core/dataLoader.js';

/**
 * Renders one card thumbnail button.
 * @param {Object} card
 * @param {Map} rarityMap - id -> rarity object (for color + label)
 * @param {Object} [opts]
 * @param {boolean} [opts.selected]
 * @param {(card:Object) => void} [opts.onClick]
 */
export function renderCardButton(card, rarityMap, opts = {}) {
  const rarity = rarityMap.get(card.rarityId);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'card-btn' + (opts.selected ? ' selected' : '');
  btn.setAttribute('aria-label', card.name);
  btn.dataset.cardId = card.id;

  const img = document.createElement('img');
  img.src = resolveAsset(card.image);
  img.loading = 'lazy';
  img.alt = card.name;
  btn.appendChild(img);

  if (rarity) {
    const flag = document.createElement('span');
    flag.className = 'rarity-flag';
    flag.textContent = rarity.label;
    flag.style.background = rarity.color;
    btn.appendChild(flag);
  }

  const cdFlag = document.createElement('span');
  cdFlag.className = 'cd-flag';
  cdFlag.textContent = 'CD' + card.cd;
  btn.appendChild(cdFlag);

  const strip = document.createElement('span');
  strip.className = 'card-name-strip';
  strip.textContent = card.name;
  btn.appendChild(strip);

  if (opts.onClick) btn.addEventListener('click', () => opts.onClick(card));
  return btn;
}
