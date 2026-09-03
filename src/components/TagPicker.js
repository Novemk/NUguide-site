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

function buildTagBtn(option, isActive, onToggle, fixedWidthPx) {
  const el = document.createElement('button');
  el.type = 'button';
  if (fixedWidthPx) el.style.width = fixedWidthPx + 'px';
  const img = document.createElement('img');
  img.src = resolveAsset(option.icon);
  img.alt = option.label;
  const span = document.createElement('span');
  span.innerHTML = highlightTagLabel(option.label);
  el.append(img, span);

  // Toggling this one tag only ever changes its own active/inactive
  // look — nothing about its label, width, or whether it needs to span
  // a full row changes — so the click handler updates this same button
  // in place instead of asking the caller to rebuild anything.
  const paintActive = () => {
    el.classList.toggle('active', isActive(option));
    el.setAttribute('aria-pressed', String(isActive(option)));
  };
  paintActive();
  el.addEventListener('click', () => {
    onToggle(option);
    paintActive();
  });
  return el;
}

// Admin-only "dumb but predictable" sizing: width is computed straight
// from the label's character count, nothing measured, nothing dependent
// on neighboring buttons — the same label is always the same width no
// matter what. An ASCII character (the "-CD" in "自身-CD") counts as
// half a unit since it renders narrower than a full CJK character.
// BASE_PX is the icon + padding + border overhead; PER_CHAR_PX is roughly
// how wide one CJK character is at this font-size. Both are estimates —
// nudge them if real labels end up looking too tight or too loose.
const BASE_PX = 56;
const PER_CHAR_PX = 17;
function visualLength(label) {
  let len = 0;
  for (const ch of label) len += /[\x00-\xFF]/.test(ch) ? 0.5 : 1;
  return len;
}
function computeFixedTagWidth(label) {
  return Math.round(BASE_PX + visualLength(label) * PER_CHAR_PX);
}

// Whether a label needs its own full-width row can't be decided from the
// text alone — it depends on how wide the actual container is *right
// now*, which is only knowable once these buttons are really in the
// page. So: render everything plain first, then — after the browser has
// actually painted a layout and the real webfont has loaded — measure
// which labels are being truncated by .tag-flow's ellipsis and only
// then mark those .opt-tag-wide, which makes them span both columns and
// re-render without truncation. Scoped to just one group's own wrap
// element (not the whole tag list), matching how paintGroup below only
// ever touches the one group that changed.
function widenOverflowingButtons(wrap) {
  const measure = () => {
    requestAnimationFrame(() => {
      for (const btn of wrap.querySelectorAll('.opt-tag:not(.opt-tag-wide)')) {
        const span = btn.querySelector('span');
        if (span && span.scrollWidth > span.clientWidth + 1) {
          btn.classList.add('opt-tag-wide');
        }
      }
    });
  };
  // document.fonts.ready only resolves once the page's actual webfont
  // (Noto Sans TC, loaded from Google Fonts) has finished downloading —
  // measuring before that reads the browser's narrower temporary
  // fallback font instead.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(measure);
  } else {
    measure();
  }
}

/**
 * Renders the full grouped tag list into `container` (cleared once, on
 * mount). Every button — group headers, and each tag button inside a
 * category — is built exactly once; toggling a tag only flips that same
 * button's own active/inactive look in place. Nothing is ever destroyed
 * and recreated after the initial build, so there's no DOM churn of any
 * kind for a click to disturb. (Two earlier, more conservative versions
 * of this rebuilt progressively smaller pieces — the whole list, then
 * just the clicked category — and still occasionally caused the
 * scrolling sidebar to visibly jump, most likely because removing a
 * focused button element and inserting a new one in its place isn't
 * something browsers handle identically. Never removing the button at
 * all sidesteps that entirely.)
 * @param {HTMLElement} container
 * @param {Array<Object>} options - tags.json entries
 * @param {{ isActive: (option:Object) => boolean, onToggle: (option:Object) => void }} handlers
 *   onToggle should just update the caller's own state/fire onChange —
 *   it must NOT re-call renderTagList itself, since this function now
 *   manages its own repainting internally.
 * @param {{ flowClass?: string }} [opts] - flowClass picks which CSS rule
 *   decides layout (see components.css). Omit it (the public site never
 *   passes this) and you get the exact behavior already confirmed
 *   working there — .tag-flow, fixed at 2 columns, live-measured
 *   wide-spanning. The admin picker passes 'tag-flow-admin' instead:
 *   flex-wrap with each button's width computed straight from its own
 *   label's character count. Same grouping/ordering/highlighting code
 *   either way — only sizing/layout differs.
 */
export function renderTagList(container, options, { isActive, onToggle }, opts = {}) {
  const flowClass = opts.flowClass || 'tag-flow';
  const isAdmin = flowClass === 'tag-flow-admin';
  container.innerHTML = '';

  function paintGroup(group, wrap) {
    wrap.className = flowClass;

    // Only used to decide DISPLAY ORDER (我方 items listed together, then
    // 自身 items together, then anything else) — not pixel alignment.
    let items = group.items;
    if (group.groupId === SELF_TEAM_SPLIT_GROUP) {
      const { teamRow, ownRow, leftover } = splitTeamOwnRows(group.items);
      items = [...teamRow, ...ownRow].filter(Boolean).concat(leftover);
    } else if (group.groupId === CD_SPLIT_GROUP) {
      const { mainRow, cdRow } = splitCdRow(group.items);
      items = [...mainRow, ...cdRow];
    }

    for (const option of items) {
      const fixedWidthPx = isAdmin ? computeFixedTagWidth(option.label) : null;
      wrap.appendChild(buildTagBtn(option, isActive, onToggle, fixedWidthPx));
    }

    // Fixed-width admin buttons never truncate by design.
    if (!isAdmin) widenOverflowingButtons(wrap);
  }

  for (const group of groupTags(options)) {
    const groupWrap = document.createElement('div');
    groupWrap.className = 'tag-group-block';
    const label = document.createElement('div');
    label.className = 'tag-group-label';
    label.textContent = group.label;
    groupWrap.appendChild(label);

    const wrap = document.createElement('div');
    groupWrap.appendChild(wrap);
    container.appendChild(groupWrap);

    paintGroup(group, wrap);
  }
}
