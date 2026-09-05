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

// Applies the admin's 網站設定 → 關卡按鈕外觀 choices as CSS custom
// properties on `root` — the actual visual rules (.so-btn/.so-row) live
// in components.css and read these vars, with sane fallbacks baked in
// via CSS's own var(--x, fallback) syntax, so a stage-button style
// object missing entirely (fresh repo, or the field renamed) doesn't
// break anything, it just falls back to plain default styling.
function applyButtonStyle(root, style) {
  const s = style || {};
  root.style.setProperty('--so-btn-font', FONT_VAR_BY_KEY[s.fontFamily] || FONT_VAR_BY_KEY.display);
  if (s.fontSize) root.style.setProperty('--so-btn-font-size', `${s.fontSize}px`);
  if (s.paddingY != null) root.style.setProperty('--so-btn-pad-y', `${s.paddingY}px`);
  if (s.paddingX != null) root.style.setProperty('--so-btn-pad-x', `${s.paddingX}px`);
  if (s.borderRadius != null) root.style.setProperty('--so-btn-radius', `${s.borderRadius}px`);
  if (s.borderWidth != null) root.style.setProperty('--so-btn-border-width', `${s.borderWidth}px`);
  root.style.setProperty('--so-btn-border-color', hexToRgba(s.borderColor, s.borderOpacity));
  root.style.setProperty('--so-divider-width', `${s.dividerWidth ?? 1}px`);
  const dividerColors = s.dividerColors && s.dividerColors.length ? s.dividerColors : [s.dividerColor || 'var(--accent-gold)', s.dividerColor || 'var(--accent-gold)'];
  root.style.setProperty('--so-divider-start', dividerColors[0]);
  root.style.setProperty('--so-divider-end', s.dividerGradientEnabled ? dividerColors[1] : dividerColors[0]);
  if (s.gradientEnabled) {
    const stops = (s.gradientColors && s.gradientColors.length ? s.gradientColors : ['#211f30', '#2a2740']).join(', ');
    root.style.setProperty('--so-btn-bg', `linear-gradient(${s.gradientAngle ?? 180}deg, ${stops})`);
  } else if (s.bgColor) {
    root.style.setProperty('--so-btn-bg', s.bgColor);
  }
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

  // Hidden stages don't show up here — same as if they'd been deleted,
  // from a player's point of view. (Their own saved team records for a
  // hidden stage still show on 我的隊伍總覽 if they have any, just
  // without a working link back to this stage — see myTeamsOverview.js.)
  const visibleStages = stages.filter((s) => !s.hidden);

  const root = document.getElementById('stage-list-root');
  root.innerHTML = '';
  root.className = 'so-wrap';
  applyButtonStyle(root, siteSettings && siteSettings.stageButtonStyle);

  if (visibleStages.length === 0) {
    root.innerHTML = '<div class="empty-state"><h3>目前還沒有關卡資料</h3><p>請由站主於後台新增關卡。</p></div>';
    return;
  }

  // group by chapter, preserving JSON order
  const chapters = [];
  const chapterIndex = new Map();
  for (const stage of visibleStages) {
    if (!chapterIndex.has(stage.chapter)) {
      chapterIndex.set(stage.chapter, { chapter: stage.chapter, stages: [] });
      chapters.push(chapterIndex.get(stage.chapter));
    }
    chapterIndex.get(stage.chapter).stages.push(stage);
  }

  for (const group of chapters) {
    const groupEl = document.createElement('div');
    groupEl.className = 'chapter-group';
    const title = document.createElement('div');
    title.className = 'chapter-title';
    title.textContent = group.chapter;
    groupEl.appendChild(title);

    const gridEl = document.createElement('div');
    gridEl.className = 'so-grid';

    // Splits this chapter's stages into rows wherever a stage has
    // rowBreak set (see stageAdmin.js's 另起一排 checkbox) — manual
    // grouping, entirely admin-controlled, no auto-wrap logic here.
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
    root.appendChild(groupEl);
  }
}

init();
