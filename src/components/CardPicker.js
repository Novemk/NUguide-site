// src/components/CardPicker.js
import { openModal } from './Modal.js';
import { mountFilterPanel } from './FilterPanel.js';
import { renderCardGrid } from './CardGrid.js';
import { loadJSON, DataSources, toMap } from '../core/dataLoader.js';
import { filterCards } from '../modules/cardFilter.js';

/**
 * Opens the card picker modal and resolves with the chosen card, or null
 * if the player closes it without picking one.
 * @returns {Promise<Object|null>}
 */
export function openCardPicker() {
  return new Promise(async (resolve) => {
    const [cards, rarities] = await Promise.all([
      loadJSON(DataSources.cards),
      loadJSON(DataSources.rarities),
    ]);
    const rarityMap = toMap(rarities);

    const body = document.createElement('div');
    const filterHost = document.createElement('div');
    const gridHost = document.createElement('div');
    gridHost.style.marginTop = '18px';
    body.append(filterHost, gridHost);

    let settled = false;
    const { close } = openModal({
      title: '選擇卡片',
      body,
      wide: true,
      onClose: () => { if (!settled) resolve(null); },
    });

    const panel = await mountFilterPanel(filterHost, (state) => {
      const filtered = filterCards(cards, state, panel.schema, panel.cdRanges);
      renderCardGrid(gridHost, filtered, rarityMap, {
        onCardClick: (card) => {
          settled = true;
          close();
          resolve(card);
        },
        emptyTitle: '沒有符合條件的卡片',
        emptyBody: '試著取消一些篩選條件，範圍會重新放寬。',
      });
    });

    renderCardGrid(gridHost, cards, rarityMap, {
      onCardClick: (card) => {
        settled = true;
        close();
        resolve(card);
      },
    });
  });
}
