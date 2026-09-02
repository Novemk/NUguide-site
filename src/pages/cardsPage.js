// src/pages/cardsPage.js
import { loadJSON, DataSources, toMap, resolveAsset } from '../core/dataLoader.js';
import { mountNavbar, mountFooter } from '../components/Navbar.js';
import { mountFilterPanel } from '../components/FilterPanel.js';
import { renderCardGrid } from '../components/CardGrid.js';
import { renderCardCrop } from '../components/CardFace.js';
import { filterCards } from '../modules/cardFilter.js';
import { sortCardsByOrder } from '../modules/cardSort.js';
import { openModal } from '../components/Modal.js';

async function init() {
  mountNavbar('cards.html');
  mountFooter();

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
  const characterMap = toMap(characters);
  const tagMap = toMap(tags);
  const cardMaps = { rarityMap, elementMap, classMap };

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

    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex; gap:20px; flex-wrap:wrap;';

    // Cropped thumbnail — same crop math + rarity border as every other
    // card, just without the badges/gradient/rarity-text overlay (that
    // info is shown as plain text/icons in the column next to it instead).
    const thumbBox = document.createElement('div');
    thumbBox.className = 'card-preview-box';
    thumbBox.appendChild(renderCardCrop({
      imageSrc: resolveAsset(card.image),
      imageAlt: card.name,
      rarity,
      imageZoom: card.imageZoom,
      imageOffsetX: card.imageOffsetX,
      imageOffsetY: card.imageOffsetY,
    }));

    const infoCol = document.createElement('div');
    infoCol.style.cssText = 'flex:1; min-width:220px;';

    const titleRow = document.createElement('div');
    titleRow.style.cssText = 'display:flex; align-items:baseline; gap:8px; margin-bottom:4px; font-family:var(--font-mono); font-weight:700;';
    titleRow.innerHTML = `
      <span style="color:${rarity ? rarity.color : 'var(--text)'};">${rarity ? rarity.label : ''}</span>
      <span style="color:var(--text-dim); font-family:var(--font-body); font-weight:400; font-size:0.9rem;">${char ? char.name : ''}</span>
    `;

    const h2 = document.createElement('h2');
    h2.style.marginBottom = '12px';
    h2.textContent = card.name;

    const metaRow = document.createElement('div');
    metaRow.className = 'card-info-meta';
    if (cls) metaRow.innerHTML += `<img class="card-info-icon" src="${resolveAsset(cls.icon)}" alt="${cls.label}" title="定位：${cls.label}">`;
    if (elem) metaRow.innerHTML += `<img class="card-info-icon" src="${resolveAsset(elem.icon)}" alt="${elem.label}" title="屬性：${elem.label}">`;
    metaRow.innerHTML += `<span class="card-info-cd">CD：${card.cd}</span>`;

    const ultimateWrap = document.createElement('div');
    ultimateWrap.style.marginBottom = '16px';
    const ultimateLabel = document.createElement('div');
    ultimateLabel.className = 'ultimate-skill-label';
    ultimateLabel.textContent = '必殺技';
    const ultimateDesc = document.createElement('div');
    ultimateDesc.className = 'ultimate-skill-desc';
    ultimateDesc.innerHTML = card.ultimateSkill && card.ultimateSkill.trim() ? card.ultimateSkill : '空白。';
    ultimateWrap.append(ultimateLabel, ultimateDesc);

    const tagRow = document.createElement('div');
    tagRow.className = 'tag-row';
    tagRow.innerHTML = cardTags.map((t) => `<span class="tag-pill"><img src="${resolveAsset(t.icon)}" alt="">${t.label}</span>`).join('') || '<span class="guide-preview">尚未設定技能標籤</span>';

    infoCol.append(titleRow, h2, metaRow, ultimateWrap, tagRow);
    wrap.append(thumbBox, infoCol);
    body.appendChild(wrap);

    openModal({ title: '卡片資訊', body });
  }

  function applyAndRender(state, schema, cdRanges) {
    const filtered = filterCards(cards, state, schema, cdRanges);
    totalLabel.textContent = `共 ${filtered.length} / ${cards.length} 張卡片`;
    renderCardGrid(gridHost, filtered, cardMaps, { onCardClick: showDetail });
  }

  const panel = await mountFilterPanel(filterHost, (state) => {
    applyAndRender(state, panel.schema, panel.cdRanges);
  });
  applyAndRender(panel.getState(), panel.schema, panel.cdRanges);
}

init();

