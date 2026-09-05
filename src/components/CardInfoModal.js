// src/components/CardInfoModal.js
// The "卡片資訊" detail modal — factored out of cardsPage.js so
// CardPicker.js (選擇卡片) can open the exact same modal from its new
// hover info button, instead of drifting into its own copy over time.
import { resolveAsset, resolveCardThumb } from '../core/dataLoader.js';
import { renderCardCrop } from './CardFace.js';
import { openModal } from './Modal.js';

/**
 * @param {Object} card
 * @param {Object} maps
 * @param {Map} maps.rarityMap
 * @param {Map} [maps.classMap]
 * @param {Map} [maps.elementMap]
 * @param {Map} [maps.characterMap]
 * @param {Map} [maps.tagMap]
 */
export function showCardInfoModal(card, maps) {
  const { rarityMap, classMap, elementMap, characterMap, tagMap } = maps;
  const rarity = rarityMap ? rarityMap.get(card.rarityId) : null;
  const cls = classMap ? classMap.get(card.classId) : null;
  const elem = elementMap ? elementMap.get(card.elementId) : null;
  const char = characterMap ? characterMap.get(card.characterId) : null;
  const cardTags = tagMap ? (card.tags || []).map((id) => tagMap.get(id)).filter(Boolean) : [];

  const body = document.createElement('div');
  body.className = 'card-info-modal-body';
  body.addEventListener('contextmenu', (e) => e.preventDefault());
  const wrap = document.createElement('div');
  // align-items:flex-start is the fix here — flex's default (stretch)
  // was forcing the fixed-size thumbnail to stretch to match whatever
  // height the info column ended up at (varies with how long the 必殺技
  // description is), which is what was distorting its aspect ratio.
  wrap.style.cssText = 'display:flex; gap:20px; flex-wrap:wrap; align-items:flex-start;';

  // Cropped thumbnail — same crop math + rarity border as every other
  // card, just without the badges/gradient/rarity-text overlay (that
  // info is shown as plain text/icons in the column next to it instead).
  const thumbBox = document.createElement('div');
  thumbBox.className = 'card-preview-box';
  thumbBox.appendChild(renderCardCrop({
    imageSrc: resolveCardThumb(card.image),
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
  if (cls) metaRow.innerHTML += `<img class="card-info-icon" src="${resolveAsset(cls.icon)}" alt="${cls.label}" title="定位：${cls.label}" draggable="false">`;
  if (elem) metaRow.innerHTML += `<img class="card-info-icon" src="${resolveAsset(elem.icon)}" alt="${elem.label}" title="屬性：${elem.label}" draggable="false">`;
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
