// src/components/TeamCard.js
import { resolveAsset } from '../core/dataLoader.js';
import { renderCardFace, BORDER_CLASS_BY_RARITY } from './CardFace.js';

// Reference size CardFace is measured against before being scaled down —
// matches the 200/260 aspect ratio used everywhere else (.card-btn,
// .card-preview-box), so badge sizes / gradient / rarity text all keep
// the exact same proportions as the full-size card, just shrunk down.
const STAGE_W = 200;
const STAGE_H = 260;

/**
 * @param {Object} team - { name, note, members: [cardId|null, ...] }
 * @param {Map} cardMap - id -> card object
 * @param {Object} [opts]
 * @param {Array<{label:string, className:string, onClick:Function}>} [opts.actions]
 * @param {boolean} [opts.showNote]
 * @param {{rarityMap?:Map, elementMap?:Map, classMap?:Map}} [opts.maps] - pass
 *   these to show the same 屬性/定位/稀有度 badges CardFace shows everywhere
 *   else (卡片資料庫、後台卡片管理…). Omitted maps just render without that badge.
 */
export function renderTeamCard(team, cardMap, opts = {}) {
  const { rarityMap, elementMap, classMap } = opts.maps || {};

  const el = document.createElement('div');
  el.className = 'team-card';

  const head = document.createElement('div');
  head.className = 'team-card-head';
  const name = document.createElement('div');
  name.className = 'team-card-name';
  name.textContent = team.name;
  head.appendChild(name);
  el.appendChild(head);

  if (opts.showNote !== false && team.note) {
    const note = document.createElement('div');
    note.className = 'team-card-note';
    note.textContent = team.note;
    el.appendChild(note);
  }

  const members = document.createElement('div');
  members.className = 'team-card-members';
  for (const cardId of team.members) {
    const card = cardId ? cardMap.get(cardId) : null;
    if (card) {
      const wrap = document.createElement('div');
      wrap.className = 'mini-avatar';

      const stage = document.createElement('div');
      stage.className = 'mini-avatar-stage';
      stage.style.width = `${STAGE_W}px`;
      stage.style.height = `${STAGE_H}px`;

      const rarity = rarityMap ? rarityMap.get(card.rarityId) : null;
      const face = renderCardFace({
        imageSrc: resolveAsset(card.image),
        imageAlt: card.name,
        rarity,
        element: elementMap ? elementMap.get(card.elementId) : null,
        cls: classMap ? classMap.get(card.classId) : null,
        imageZoom: card.imageZoom,
        imageOffsetX: card.imageOffsetX,
        imageOffsetY: card.imageOffsetY,
      });
      stage.appendChild(face);
      wrap.appendChild(stage);

      // The rarity border drawn *inside* the scaled stage (see CardFace.js)
      // is suppressed at this size (.mini-avatar-stage .card-face-border
      // in components.css) — its CSS-mask technique loses crisp edges on
      // the right/bottom once rendered at full size and then shrunk by
      // transform:scale. Redrawn here instead, directly at the avatar's
      // own real 80×104 size, so it's never scaled and can't lose a sliver.
      const borderClass = rarity && BORDER_CLASS_BY_RARITY[rarity.id];
      if (borderClass) {
        const border = document.createElement('div');
        border.className = `mini-avatar-border ${borderClass}`;
        wrap.appendChild(border);
      }

      members.appendChild(wrap);
    } else {
      const wrap = document.createElement('div');
      wrap.className = 'mini-avatar-empty';
      wrap.textContent = '—';
      members.appendChild(wrap);
    }
  }
  el.appendChild(members);

  if (opts.actions && opts.actions.length) {
    const footer = document.createElement('div');
    footer.className = 'team-card-footer';
    for (const action of opts.actions) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = action.className || 'btn btn-sm';
      btn.textContent = action.label;
      btn.addEventListener('click', () => action.onClick(team));
      footer.appendChild(btn);
    }
    el.appendChild(footer);
  }

  return el;
}
