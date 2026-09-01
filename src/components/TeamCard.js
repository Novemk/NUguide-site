// src/components/TeamCard.js
import { resolveAsset } from '../core/dataLoader.js';

/**
 * @param {Object} team - { name, note, members: [cardId|null, ...] }
 * @param {Map} cardMap - id -> card object
 * @param {Object} [opts]
 * @param {Array<{label:string, className:string, onClick:Function}>} [opts.actions]
 * @param {boolean} [opts.showNote]
 */
export function renderTeamCard(team, cardMap, opts = {}) {
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
      const img = document.createElement('img');
      img.src = resolveAsset(card.image);
      img.alt = card.name;
      wrap.appendChild(img);
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
