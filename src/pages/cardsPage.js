// src/pages/cardsPage.js
import { loadJSON, DataSources, toMap, resolveAsset } from '../core/dataLoader.js';
import { mountNavbar, mountFooter } from '../components/Navbar.js';
import { mountFilterPanel } from '../components/FilterPanel.js';
import { renderCardGrid } from '../components/CardGrid.js';
import { filterCards } from '../modules/cardFilter.js';
import { openModal } from '../components/Modal.js';

async function init() {
  mountNavbar('cards.html');
  mountFooter();

  const [cards, rarities, classes, elements, characters, tags] = await Promise.all([
    loadJSON(DataSources.cards),
    loadJSON(DataSources.rarities),
    loadJSON(DataSources.classes),
    loadJSON(DataSources.elements),
    loadJSON(DataSources.characters),
    loadJSON(DataSources.tags),
  ]);
  const rarityMap = toMap(rarities);
  const classMap = toMap(classes);
  const elementMap = toMap(elements);
  const characterMap = toMap(characters);
  const tagMap = toMap(tags);

  const filterHost = document.getElementById('filter-host');
  const gridHost = document.getElementById('card-grid-host');
  const totalLabel = document.getElementById('result-count');

  function showDetail(card) {
    const body = document.createElement('div');
    const rarity = rarityMap.get(card.rarityId);
    const cls = classMap.get(card.classId);
    const elem = elementMap.get(card.elementId);
    const char = characterMap.get(card.characterId);
    const cardTags = (card.tags || []).map((id) => tagMap.get(id)).filter(Boolean);

    body.innerHTML = `
      <div style="display:flex; gap:20px; flex-wrap:wrap;">
        <img src="${resolveAsset(card.image)}" alt="${card.name}" style="width:160px; border-radius:10px; border:2px solid ${rarity ? rarity.color : 'var(--border)'};">
        <div style="flex:1; min-width:200px;">
          <div style="font-family:var(--font-mono); color:${rarity ? rarity.color : 'var(--text)'}; font-weight:700; margin-bottom:4px;">${rarity ? rarity.label : ''}</div>
          <h2 style="margin-bottom:12px;">${card.name}</h2>
          <div style="display:flex; gap:16px; flex-wrap:wrap; margin-bottom:14px; font-size:0.88rem; color:var(--text-dim);">
            <span>角色：${char ? char.name : '—'}</span>
            <span>定位：${cls ? cls.label : '—'}</span>
            <span>屬性：${elem ? elem.label : '—'}</span>
            <span>CD：${card.cd}</span>
          </div>
          <div class="tag-row">
            ${cardTags.map((t) => `<span class="tag-pill"><img src="${resolveAsset(t.icon)}" alt="">${t.label}</span>`).join('') || '<span class="guide-preview">尚未設定技能標籤</span>'}
          </div>
        </div>
      </div>
    `;
    openModal({ title: '卡片資訊', body });
  }

  function applyAndRender(state, schema, cdRanges) {
    const filtered = filterCards(cards, state, schema, cdRanges);
    totalLabel.textContent = `共 ${filtered.length} / ${cards.length} 張卡片`;
    renderCardGrid(gridHost, filtered, rarityMap, { onCardClick: showDetail });
  }

  const panel = await mountFilterPanel(filterHost, (state) => {
    applyAndRender(state, panel.schema, panel.cdRanges);
  });
  applyAndRender(panel.getState(), panel.schema, panel.cdRanges);
}

init();
