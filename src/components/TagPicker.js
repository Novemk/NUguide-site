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

// Whether a label needs its own full-width row can't be decided from the
// text alone (a fixed character-count guess calibrated for the public
// site's narrow 260px filter sidebar was forcing 8-character labels onto
// their own row even inside the admin's much wider picker, where they'd
// easily fit two-up) — it depends on how wide the actual container is
// *right now*, which is only knowable once these buttons are really in
// the page. So: render everything plain first, then — after the caller
// has attached `container` to the document and the browser has painted
// a layout — measure which labels are actually being truncated by
// .tag-flow's ellipsis and only then mark those .opt-tag-wide, which
// makes them span both columns and re-render without truncation.
function widenOverflowingTags(container) {
  const measure = () => {
    requestAnimationFrame(() => {
      for (const wrap of container.querySelectorAll('.tag-flow')) {
        for (const btn of wrap.querySelectorAll('.opt-tag:not(.opt-tag-wide)')) {
          const span = btn.querySelector('span');
          if (span && span.scrollWidth > span.clientWidth + 1) {
            btn.classList.add('opt-tag-wide');
          }
        }
      }
    });
  };
  // document.fonts.ready only resolves once the page's actual webfont
  // (Noto Sans TC, loaded from Google Fonts) has finished downloading —
  // measuring before that was reading widths of the browser's temporary
  // fallback font, which is narrower, so some labels that only overflow
  // in the *real* font were silently measured as "fits fine" and never
  // got widened. Falls back to measuring immediately if the Font Loading
  // API isn't available for some reason, rather than never measuring.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(measure);
  } else {
    measure();
  }
}

/**
 * Renders the full grouped tag list into `container` (cleared first).
 * Every row uses the same rule everywhere: pairs of short labels sit
 * side by side, anything long enough to risk wrapping spans the full
 * row on its own (see WIDE_LABEL_THRESHOLD / .tag-flow) — no exceptions
 * for particular groups, so the layout reads as one consistent rule
 * instead of behaving differently row to row.
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

    // Only used to decide DISPLAY ORDER now (我方 items listed together,
    // then 自身 items together, then anything else) — not to force the
    // two sets into pixel-aligned columns, which needed a fixed width
    // that didn't actually fit two per row in the narrow 260px sidebar
    // this also has to render in, and ended up looking inconsistent with
    // every other row's short-pairs-up/long-spans-alone rule.
    let items = group.items;
    if (group.groupId === SELF_TEAM_SPLIT_GROUP) {
      const { teamRow, ownRow, leftover } = splitTeamOwnRows(group.items);
      items = [...teamRow, ...ownRow].filter(Boolean).concat(leftover);
    } else if (group.groupId === CD_SPLIT_GROUP) {
      const { mainRow, cdRow } = splitCdRow(group.items);
      items = [...mainRow, ...cdRow];
    }

    const wrap = document.createElement('div');
    wrap.className = 'tag-flow';
    for (const option of items) wrap.appendChild(buildTagBtn(option, isActive, onToggle));
    groupWrap.appendChild(wrap);

    container.appendChild(groupWrap);
  }
  widenOverflowingTags(container);
}
