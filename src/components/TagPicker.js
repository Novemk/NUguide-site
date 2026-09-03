// src/components/TagPicker.js
// Shared "list of selectable skill tags" renderer — grouped under category
// headers, with the 我方增傷 group split into aligned 我方/自身 rows and
// the 生存/治療 group's "-CD" series on its own row (see src/core/
// tagGroups.js), plus 必殺/普攻/持續/觸發 keyword highlighting in each
// label. Used by both the public site's 卡片資料庫 filter sidebar
// (FilterPanel.js) and the admin's 技能 Tag 可複選 picker
// (fieldSelectors.js) — one implementation, so the two can't drift apart.
import { resolveAsset } from '../core/dataLoader.js';
import { groupTags, splitTeamOwnRows, SELF_TEAM_SPLIT_GROUP, splitCdRow, CD_SPLIT_GROUP } from '../core/tagGroups.js';

const TAG_KEYWORD_COLORS = {
  '必殺': '#ff9ec7',
  '普攻': '#8ecdf2',
  '持續': '#c3a6f7',
  '觸發': '#f2e07a',
};

export function highlightTagLabel(label) {
  let html = '';
  let i = 0;
  while (i < label.length) {
    let matched = false;
    for (const keyword in TAG_KEYWORD_COLORS) {
      if (label.startsWith(keyword, i)) {
        html += `<span style="color:${TAG_KEYWORD_COLORS[keyword]}">${keyword}</span>`;
        i += keyword.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      const ch = label[i];
      html += ch === '<' ? '&lt;' : ch === '&' ? '&amp;' : ch;
      i++;
    }
  }
  return html;
}

function buildTagBtn(option, isActive, onToggle) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'opt-tag' + (isActive(option) ? ' active' : '');
  el.setAttribute('aria-pressed', String(isActive(option)));
  const img = document.createElement('img');
  img.src = resolveAsset(option.icon);
  img.alt = option.label;
  const span = document.createElement('span');
  span.innerHTML = highlightTagLabel(option.label);
  el.append(img, span);
  el.addEventListener('click', () => onToggle(option));
  return el;
}

/**
 * Renders the full grouped tag list into `container` (cleared first).
 * @param {HTMLElement} container
 * @param {Array<Object>} options - tags.json entries
 * @param {{ isActive: (option:Object) => boolean, onToggle: (option:Object) => void }} handlers
 */
export function renderTagList(container, options, { isActive, onToggle }) {
  container.innerHTML = '';
  for (const group of groupTags(options)) {
    const groupWrap = document.createElement('div');
    groupWrap.className = 'tag-group-block';
    const label = document.createElement('div');
    label.className = 'tag-group-label';
    label.textContent = group.label;
    groupWrap.appendChild(label);

    if (group.groupId === SELF_TEAM_SPLIT_GROUP) {
      const { teamRow, ownRow, leftover } = splitTeamOwnRows(group.items);
      for (const row of [teamRow, ownRow]) {
        const rowWrap = document.createElement('div');
        rowWrap.className = 'filter-options tag-row-aligned';
        for (const option of row) {
          if (option) {
            rowWrap.appendChild(buildTagBtn(option, isActive, onToggle));
          } else {
            const placeholder = document.createElement('span');
            placeholder.className = 'opt-tag opt-tag-placeholder';
            placeholder.setAttribute('aria-hidden', 'true');
            rowWrap.appendChild(placeholder);
          }
        }
        groupWrap.appendChild(rowWrap);
      }
      if (leftover.length) {
        const leftoverWrap = document.createElement('div');
        leftoverWrap.className = 'filter-options';
        for (const option of leftover) leftoverWrap.appendChild(buildTagBtn(option, isActive, onToggle));
        groupWrap.appendChild(leftoverWrap);
      }
    } else if (group.groupId === CD_SPLIT_GROUP) {
      const { mainRow, cdRow } = splitCdRow(group.items);
      const mainWrap = document.createElement('div');
      mainWrap.className = 'filter-options';
      for (const option of mainRow) mainWrap.appendChild(buildTagBtn(option, isActive, onToggle));
      groupWrap.appendChild(mainWrap);
      if (cdRow.length) {
        const cdWrap = document.createElement('div');
        cdWrap.className = 'filter-options tag-row-aligned';
        for (const option of cdRow) cdWrap.appendChild(buildTagBtn(option, isActive, onToggle));
        groupWrap.appendChild(cdWrap);
      }
    } else {
      const wrap = document.createElement('div');
      wrap.className = 'filter-options';
      for (const option of group.items) wrap.appendChild(buildTagBtn(option, isActive, onToggle));
      groupWrap.appendChild(wrap);
    }

    container.appendChild(groupWrap);
  }
}
