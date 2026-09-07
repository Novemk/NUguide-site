// src/pages/stagesList.js
import { loadJSON, DataSources } from '../core/dataLoader.js';
import { mountNavbar, mountFooter } from '../components/Navbar.js';

// Converts a #rrggbb + 0-100 opacity into rgba(...) — used for the
// button border color, since CSS itself has no "hex + separate opacity
// %" syntax; this is computed once per page load, not live-measured.
function hexToRgba(hex, opacityPercent) {
  const h = (hex || '#3a3650').replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) || 0;
  const g = parseInt(h.substring(2, 4), 16) || 0;
  const b = parseInt(h.substring(4, 6), 16) || 0;
  const a = Math.max(0, Math.min(100, opacityPercent ?? 100)) / 100;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

const FONT_VAR_BY_KEY = {
  display: 'var(--font-display)',
  body: 'var(--font-body)',
  mono: 'var(--font-mono)',
};

// Applies a 關卡按鈕外觀-shaped style object as CSS custom properties on
// `el` — the actual visual rules (.so-btn/.so-row) live in components.css
// and read these vars, with sane fallbacks baked in via CSS's own
// var(--x, fallback) syntax. Shared between the main button style and
// 過往關卡's own independent one — same shape, just applied to a
// different element, so whichever one is nearer in the DOM wins for any
// .so-btn inside it.
function applyButtonStyle(el, style) {
  const s = style || {};
  el.style.setProperty('--so-btn-font', FONT_VAR_BY_KEY[s.fontFamily] || FONT_VAR_BY_KEY.display);
  if (s.fontSize) el.style.setProperty('--so-btn-font-size', `${s.fontSize}px`);
  if (s.paddingY != null) el.style.setProperty('--so-btn-pad-y', `${s.paddingY}px`);
  if (s.paddingX != null) el.style.setProperty('--so-btn-pad-x', `${s.paddingX}px`);
  if (s.borderRadius != null) el.style.setProperty('--so-btn-radius', `${s.borderRadius}px`);
  if (s.borderWidth != null) el.style.setProperty('--so-btn-border-width', `${s.borderWidth}px`);
  el.style.setProperty('--so-btn-border-color', hexToRgba(s.borderColor, s.borderOpacity));
  el.style.setProperty('--so-divider-width', `${s.dividerWidth ?? 1}px`);
  const dividerColors = s.dividerColors && s.dividerColors.length ? s.dividerColors : [s.dividerColor || 'var(--accent-gold)', s.dividerColor || 'var(--accent-gold)'];
  el.style.setProperty('--so-divider-start', dividerColors[0]);
  el.style.setProperty('--so-divider-end', s.dividerGradientEnabled ? dividerColors[1] : dividerColors[0]);
  if (s.gradientEnabled) {
    const stops = (s.gradientColors && s.gradientColors.length ? s.gradientColors : ['#211f30', '#2a2740']).join(', ');
    el.style.setProperty('--so-btn-bg', `linear-gradient(${s.gradientAngle ?? 180}deg, ${stops})`);
  } else if (s.bgColor) {
    el.style.setProperty('--so-btn-bg', s.bgColor);
  }
}

// Groups a flat stage list by chapter (preserving first-appearance
// order), sorted by 排序編號 within each — shared by both the main
// section and 過往關卡.
function groupByChapter(stageList) {
  const chapters = [];
  const chapterIndex = new Map();
  for (const stage of stageList) {
    if (!chapterIndex.has(stage.chapter)) {
      chapterIndex.set(stage.chapter, { chapter: stage.chapter, stages: [] });
      chapters.push(chapterIndex.get(stage.chapter));
    }
    chapterIndex.get(stage.chapter).stages.push(stage);
  }
  for (const group of chapters) {
    group.stages.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }
  return chapters;
}

// Renders one chapter's title + button grid (the row-break splitting,
// per stageAdmin.js's 另起一排 checkbox, is entirely admin-controlled,
// no auto-wrap logic here) — used for both a normal chapter box and a
// chapter listed inside 過往關卡.
function renderChapterGroup(group) {
  const groupEl = document.createElement('div');
  groupEl.className = 'chapter-group';
  const title = document.createElement('div');
  title.className = 'chapter-title';
  title.textContent = group.chapter;
  groupEl.appendChild(title);

  const gridEl = document.createElement('div');
  gridEl.className = 'so-grid';

  const rows = [];
  let currentRow = [];
  for (const stage of group.stages) {
    if (stage.rowBreak && currentRow.length > 0) {
      rows.push(currentRow);
      currentRow = [];
    }
    currentRow.push(stage);
  }
  if (currentRow.length) rows.push(currentRow);

  for (const row of rows) {
    const rowEl = document.createElement('div');
    rowEl.className = 'so-row';
    for (const stage of row) {
      const link = document.createElement('a');
      link.className = 'so-btn';
      link.href = `stage-detail.html?id=${encodeURIComponent(stage.id)}`;
      link.textContent = stage.order;
      rowEl.appendChild(link);
    }
    gridEl.appendChild(rowEl);
  }

  groupEl.appendChild(gridEl);
  return groupEl;
}

async function init() {
  mountNavbar('stages.html');
  mountFooter();

  const [stages, siteSettings] = await Promise.all([
    loadJSON(DataSources.stages),
    loadJSON(DataSources.siteSettings).catch(() => null),
  ]);
  if (siteSettings && siteSettings.stagesDescription) {
    const descEl = document.getElementById('stages-description');
    if (descEl) descEl.innerHTML = siteSettings.stagesDescription;
  }

  // Hidden stages don't show up here at all, same as before. Among the
  // rest, 過往關卡 (archived) stages are split into their own section
  // further down the page (2026-09-06) instead of sitting mixed in with
  // their chapter's other stages — see stageAdmin.js's 過往關卡 checkbox.
  const activeStages = stages.filter((s) => !s.hidden && !s.archived);
  const pastStages = stages.filter((s) => !s.hidden && s.archived);

  const root = document.getElementById('stage-list-root');
  root.innerHTML = '';
  root.className = 'so-wrap';
  applyButtonStyle(root, siteSettings && siteSettings.stageButtonStyle);

  if (activeStages.length === 0 && pastStages.length === 0) {
    root.innerHTML = '<div class="empty-state"><h3>目前還沒有關卡資料</h3><p>請由站主於後台新增關卡。</p></div>';
    return;
  }

  // Per-chapter box color (2026-09-06) — keyed by the exact chapter
  // string (e.g. "忘卻遺跡 第 22 季"), set in 網站設定 → 章節外觀. A
  // chapter with no entry there just falls back to the plain default
  // box (see .chapter-group's own var(...,fallback) in components.css).
  const chapterStyles = (siteSettings && siteSettings.chapterStyles) || {};
  for (const group of groupByChapter(activeStages)) {
    const groupEl = renderChapterGroup(group);
    const cs = chapterStyles[group.chapter];
    if (cs) {
      if (cs.bgColor) groupEl.style.setProperty('--chapter-box-bg', hexToRgba(cs.bgColor, cs.bgOpacity));
      if (cs.borderColor) groupEl.style.setProperty('--chapter-box-border', hexToRgba(cs.borderColor, cs.borderOpacity));
    }
    root.appendChild(groupEl);
  }

  if (pastStages.length) {
    const pastStyle = (siteSettings && siteSettings.pastSectionStyle) || {};

    const divider = document.createElement('div');
    divider.className = 'stage-past-divider';
    if (pastStyle.dividerColor) divider.style.setProperty('--past-divider-color', pastStyle.dividerColor);
    if (pastStyle.dividerWidth != null) divider.style.setProperty('--past-divider-width', `${pastStyle.dividerWidth}px`);
    root.appendChild(divider);

    const heading = document.createElement('div');
    heading.className = 'stage-past-heading';
    heading.textContent = '過往關卡';
    root.appendChild(heading);

    const pastSection = document.createElement('div');
    pastSection.className = 'stage-past-section';
    if (pastStyle.boxBgColor) pastSection.style.setProperty('--past-box-bg', hexToRgba(pastStyle.boxBgColor, pastStyle.boxBgOpacity));
    if (pastStyle.boxBorderColor) pastSection.style.setProperty('--past-box-border', hexToRgba(pastStyle.boxBorderColor, pastStyle.boxBorderOpacity));
    if (pastStyle.chapterTitleColor) pastSection.style.setProperty('--past-chapter-title-color', pastStyle.chapterTitleColor);
    if (pastStyle.chapterTitleFontSize) pastSection.style.setProperty('--past-chapter-title-size', `${pastStyle.chapterTitleFontSize}px`);
    // Button appearance scoped to just this section — see the
    // components.css comment on .stage-past-section for why setting
    // the SAME --so-btn-*/--so-divider-* vars here (instead of on the
    // page root like the main section above) is enough on its own.
    applyButtonStyle(pastSection, pastStyle.buttonStyle);

    for (const group of groupByChapter(pastStages)) {
      pastSection.appendChild(renderChapterGroup(group));
    }
    root.appendChild(pastSection);
  }
}

init();
