// src/components/CardPicker.js
import { openModal } from './Modal.js';
import { mountFilterPanel } from './FilterPanel.js';
import { renderCardGrid } from './CardGrid.js';
import { renderCardButton } from './CardButton.js';
import { showCardInfoModal } from './CardInfoModal.js';
import { loadJSON, DataSources, toMap } from '../core/dataLoader.js';
import { filterCards } from '../modules/cardFilter.js';
import { sortCardsByOrder } from '../modules/cardSort.js';

/**
 * Opens the card picker modal and resolves with the chosen card, or null
 * if the player closes it without picking one.
 * @param {Object} [opts]
 * @param {string[]} [opts.excludeIds] - card ids to show dimmed and
 *   unclickable — e.g. the OTHER cards already in the team being built,
 *   so the same card can't be picked twice into one team. Omit (or leave
 *   the slot currently being edited out of the list) to allow it.
 * @returns {Promise<Object|null>}
 */
export function openCardPicker(opts = {}) {
  const excludeIds = new Set(opts.excludeIds || []);
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
      isDisabled: (card) => excludeIds.has(card.id),
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

/**
 * Opens a "build the whole team in one sitting" picker (2026-09-09) —
 * unlike openCardPicker (resolves once, on the FIRST click, then closes),
 * this stays open across multiple picks: click a card in the grid and it
 * fills the next empty slot, live, no separate "confirm" step — same
 * feel as the game's own team-select screen. A row of 5 slots at the top
 * shows the live state (empty slots show just their number; filled ones
 * show the card's thumbnail); each filled slot also gets a small "移到
 * 第__位" dropdown that re-INSERTS the card at the chosen position
 * (shifting the cards in between, not a plain two-way swap) rather than
 * requiring drag-and-drop, which doesn't behave well on touch without a
 * lot of extra plumbing this didn't seem to need. Resolves with the
 * final 5-slot array (some entries possibly null) whenever the modal is
 * closed — there's no separate "確定" button, closing the modal (✕ or
 * clicking outside) IS confirming, matching every other close-to-commit
 * flow already used elsewhere on this site (2026-09-09, shared by 我的
 * 隊伍/推薦隊伍/版主的隊伍 — one component, so all three stay in sync
 * automatically instead of three separate copies that could drift).
 * @param {(string|null)[]} [initialMembers] - up to 5 card ids, already
 *   in the team (or already-empty slots) when the picker opens.
 * @returns {Promise<(string|null)[]>} always 5 entries, unfilled slots are null.
 */
export function openTeamPicker(initialMembers = []) {
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
    const cardMap = toMap(cards);
    const rarityMap = toMap(rarities);
    const classMap = toMap(classes);
    const elementMap = toMap(elements);
    const cardMaps = { rarityMap, classMap, elementMap };
    const infoMaps = { rarityMap, classMap, elementMap, characterMap: toMap(characters), tagMap: toMap(tags) };

    let members = [0, 1, 2, 3, 4].map((i) => initialMembers[i] || null);

    const body = document.createElement('div');
    const slotRow = document.createElement('div');
    slotRow.className = 'tp-slot-row';
    body.appendChild(slotRow);

    const layout = document.createElement('div');
    layout.className = 'filter-grid-layout';
    const filterHost = document.createElement('div');
    filterHost.className = 'fg-sidebar';
    const gridCol = document.createElement('div');
    const gridHost = document.createElement('div');
    gridCol.appendChild(gridHost);
    layout.append(filterHost, gridCol);
    body.appendChild(layout);

    const { close } = openModal({
      title: '選擇隊伍（點卡片依序加入，關閉視窗即完成）',
      body,
      wide: true,
      onClose: () => resolve(members),
    });

    function renderSlots() {
      slotRow.innerHTML = '';
      members.forEach((cardId, idx) => {
        const slot = document.createElement('div');
        slot.className = 'tp-slot';
        const card = cardId ? cardMap.get(cardId) : null;
        if (card) {
          // 跟卡片資料庫/選卡格子同一顆元件，才會有一樣的裁切定位
          // (imageZoom/imageOffsetX/imageOffsetY)、稀有度邊框、屬性/
          // 定位徽章、SSR 字樣——不要自己另外刻一份簡化版
          // (2026-09-09 修正：原本這裡是純 <img>，跟卡片本體長得不一樣)。
          // 點卡片本身 = 直接把這張移除，空出這一格（不用另外找刪除按鈕）。
          const cardBtn = renderCardButton(card, cardMaps, {
            thumbnail: true,
            onClick: () => { members[idx] = null; renderSlots(); renderGrid(); },
          });
          cardBtn.title = '點一下移除這張卡';
          slot.appendChild(cardBtn);

          const select = document.createElement('select');
          select.className = 'tp-slot-select';
          for (let i = 0; i < 5; i++) {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = `第 ${i + 1} 位`;
            if (i === idx) opt.selected = true;
            select.appendChild(opt);
          }
          select.addEventListener('click', (e) => e.stopPropagation());
          select.addEventListener('change', () => {
            const to = Number(select.value);
            if (to === idx) return;
            // 插入式重排：把這張抽出來，其他卡往中間補，再插進目標位置
            // （不是單純跟目標位置兩兩互換）——2026-09-09 確認過的邏輯。
            const moved = members[idx];
            members.splice(idx, 1);
            members.splice(to, 0, moved);
            renderSlots();
          });
          slot.appendChild(select);
        } else {
          const empty = document.createElement('div');
          empty.className = 'tp-slot-empty';
          const num = document.createElement('span');
          num.className = 'tp-slot-num';
          num.textContent = idx + 1;
          empty.appendChild(num);
          slot.appendChild(empty);
        }
        slotRow.appendChild(slot);
      });
    }

    function pickCard(card) {
      const emptyIdx = members.findIndex((m) => !m);
      if (emptyIdx === -1) return; // 五格都滿了，點下去不會有反應
      members[emptyIdx] = card.id;
      renderSlots();
      renderGrid();
    }

    function currentFiltered(state) {
      return filterCards(cards, state, panel.schema, panel.cdRanges);
    }

    let lastFiltered = cards;
    function renderGrid() {
      renderCardGrid(gridHost, lastFiltered, cardMaps, {
        onCardClick: pickCard,
        onInfoClick: (card) => showCardInfoModal(card, infoMaps),
        isDisabled: (card) => members.includes(card.id),
        compact: true,
        emptyTitle: '沒有符合條件的卡片',
        emptyBody: '試著取消一些篩選條件，範圍會重新放寬。',
      });
    }

    const panel = await mountFilterPanel(filterHost, (state) => {
      lastFiltered = currentFiltered(state);
      renderGrid();
    });

    renderSlots();
    renderGrid();
  });
}
