// src/components/CardPicker.js
import { openModal } from './Modal.js';
import { mountFilterPanel } from './FilterPanel.js';
import { renderCardGrid } from './CardGrid.js';
import { showCardInfoModal } from './CardInfoModal.js';
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
    const [cardsRaw, rarities, classes, elements, characters, tags] = await Promise.all([
      loadJSON(DataSources.cards),
      loadJSON(DataSources.rarities),
      loadJSON(DataSources.classes),
      loadJSON(DataSources.elements),
      loadJSON(DataSources.characters),
      loadJSON(DataSources.tags),
    ]);
    const cards = sortCardsByOrder(cardsRaw);
    const rarityMap = toMap(rarities);
    const classMap = toMap(classes);
    const elementMap = toMap(elements);
    const cardMaps = { rarityMap, classMap, elementMap };
    // For the hover info button's 卡片資訊 modal — same shape CardInfoModal
    // expects everywhere else it's used.
    const infoMaps = { rarityMap, classMap, elementMap, characterMap: toMap(characters), tagMap: toMap(tags) };

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

    function pickCard(card) {
      settled = true;
      close();
      resolve(card);
    }

    const gridOpts = {
      onCardClick: pickCard,
      onInfoClick: (card) => showCardInfoModal(card, infoMaps),
      compact: true,
      emptyTitle: '沒有符合條件的卡片',
      emptyBody: '試著取消一些篩選條件，範圍會重新放寬。',
    };

    const panel = await mountFilterPanel(filterHost, (state) => {
      const filtered = filterCards(cards, state, panel.schema, panel.cdRanges);
      renderCardGrid(gridHost, filtered, cardMaps, gridOpts);
    });

    renderCardGrid(gridHost, cards, cardMaps, gridOpts);
  });
}
