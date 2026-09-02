// src/components/CardPicker.js
import { openModal } from './Modal.js';
import { mountFilterPanel } from './FilterPanel.js';
import { renderCardGrid } from './CardGrid.js';
import { loadJSON, DataSources, toMap } from '../core/dataLoader.js';
import { filterCards } from '../modules/cardFilter.js';
import { sortCardsByOrder } from '../modules/cardSort.js';

/**
 * Opens the card picker modal and resolves with the chosen card, or null
 * if the player closes it without picking one.
 * @returns {Promise<Object|null>}
 */
export function openCardPicker() {
  return new Promise(async (resolve) => {
    const [cardsRaw, rarities, classes, elements] = await Promise.all([
      loadJSON(DataSources.cards),
      loadJSON(DataSources.rarities),
      loadJSON(DataSources.classes),
      loadJSON(DataSources.elements),
    ]);
    const cards = sortCardsByOrder(cardsRaw);
    const cardMaps = {
      rarityMap: toMap(rarities),
      classMap: toMap(classes),
      elementMap: toMap(elements),
    };

    const body = document.createElement('div');
    const layout = document.createElement('div');
    layout.className = 'filter-grid-layout';
    const filterHost = document.createElement('div');
    filterHost.className = 'fg-sidebar';
    const gridCol = document.createElement('div');
    const gridHost = document.createElement('div');
    gridCol.appendChild(gridHost);
    layout.append(filterHost, gridCol);
    body.appendChild(layout);

    let settled = false;
    const { close } = openModal({
      title: '選擇卡片',
      body,
      wide: true,
      onClose: () => { if (!settled) resolve(null); },
    });

    const panel = await mountFilterPanel(filterHost, (state) => {
      const filtered = filterCards(cards, state, panel.schema, panel.cdRanges);
      renderCardGrid(gridHost, filtered, cardMaps, {
        onCardClick: (card) => {
          settled = true;
          close();
          resolve(card);
        },
        emptyTitle: '沒有符合條件的卡片',
        emptyBody: '試著取消一些篩選條件，範圍會重新放寬。',
      });
    });

    renderCardGrid(gridHost, cards, cardMaps, {
      onCardClick: (card) => {
        settled = true;
        close();
        resolve(card);
      },
    });
  });
}
