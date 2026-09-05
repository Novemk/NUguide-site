// src/pages/stageDetail.js
import { loadJSON, DataSources, toMap } from '../core/dataLoader.js';
import { mountNavbar, mountFooter, getSiteTitle } from '../components/Navbar.js';
import { renderTeamCard } from '../components/TeamCard.js';
import { renderEnemyChip } from '../components/EnemyPortrait.js';
import { renderMyTeamsSection } from '../modules/myTeamsSection.js';

function getStageIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

async function init() {
  mountNavbar('stages.html');
  mountFooter();

  const stageId = getStageIdFromUrl();
  const root = document.getElementById('stage-root');

  if (!stageId) {
    root.innerHTML = '<div class="empty-state"><h3>找不到關卡</h3><p>網址缺少關卡代碼，請從關卡列表重新進入。</p></div>';
    return;
  }

  const [stages, stageTeams, cards, elements, rarities, classes] = await Promise.all([
    loadJSON(DataSources.stages),
    loadJSON(DataSources.stageTeams),
    loadJSON(DataSources.cards),
    loadJSON(DataSources.elements),
    loadJSON(DataSources.rarities),
    loadJSON(DataSources.classes),
  ]);

  const stage = stages.find((s) => s.id === stageId);
  // A hidden stage behaves exactly like a deleted one from here — same
  // message, whether you got here via a direct link, a bookmark, or a
  // stale link someone shared before it was hidden. Its data isn't
  // actually gone (see myTeamsOverview.js, which still shows a
  // player's own saved team records for it), this page just won't open.
  if (!stage || stage.hidden) {
    root.innerHTML = '<div class="empty-state"><h3>找不到這個關卡</h3><p>可能已被移除，請回到關卡列表重新選擇。</p></div>';
    return;
  }

  const cardMap = toMap(cards);
  const elementMap = toMap(elements);
  const rarityMap = toMap(rarities);
  const classMap = toMap(classes);
  const cardMaps = { rarityMap, elementMap, classMap };
  const officialTeams = (stageTeams.find((t) => t.stageId === stageId) || {}).teams || [];

  document.title = `${stage.chapter} ${stage.order} | ${await getSiteTitle()}`;

  // Header is a dropdown, not static text — 標題 doesn't exist anymore
  // (章節 already names things; see the earlier discussion), and this
  // doubles as a quick way to jump straight to another stage without
  // going back to 關卡攻略's own button grid. Grouped by chapter via
  // <optgroup> so a long list still reads in sections.
  const visibleStages = stages.filter((s) => !s.hidden);
  const chapterOrder = [];
  const byChapter = new Map();
  for (const s of visibleStages) {
    if (!byChapter.has(s.chapter)) { byChapter.set(s.chapter, []); chapterOrder.push(s.chapter); }
    byChapter.get(s.chapter).push(s);
  }
  for (const list of byChapter.values()) {
    list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }
  const optionsHtml = chapterOrder.map((chapter) => `
    <optgroup label="${chapter}">
      ${byChapter.get(chapter).map((s) => `<option value="${s.id}" ${s.id === stage.id ? 'selected' : ''}>${chapter} · ${s.order}</option>`).join('')}
    </optgroup>
  `).join('');

  document.getElementById('stage-header').innerHTML = `
    <div class="page-eyebrow">${stage.chapter}</div>
    <select class="stage-switcher" id="stage-switcher">${optionsHtml}</select>
  `;
  document.getElementById('stage-switcher').addEventListener('change', (e) => {
    window.location.href = `stage-detail.html?id=${encodeURIComponent(e.target.value)}`;
  });

  // Enemies
  const enemyList = document.getElementById('enemy-list');
  enemyList.innerHTML = '';
  if (stage.enemies && stage.enemies.length) {
    for (const enemy of stage.enemies) {
      enemyList.appendChild(renderEnemyChip(enemy, elementMap));
    }
  } else {
    enemyList.innerHTML = '<p class="guide-preview">尚未提供敵人資訊。</p>';
  }

  // Guide (rich text HTML from admin editor)
  document.getElementById('guide-content').innerHTML = stage.guide || '<p>尚未撰寫攻略。</p>';

  // Round table (回合表) — a real <table>, entirely separate from the
  // rich-text guide content above (see stageAdmin.js's roundTable field).
  // Only rendered when the stage actually has rows; a stage that never
  // used this feature just doesn't show a table at all.
  const roundTable = stage.roundTable || [];
  if (roundTable.length > 0) {
    const table = document.createElement('table');
    table.className = 'rt-table';
    for (const row of roundTable) {
      const tr = document.createElement('tr');
      const td1 = document.createElement('td');
      td1.innerHTML = row.col1 || '';
      const td2 = document.createElement('td');
      td2.innerHTML = row.col2 || '';
      tr.append(td1, td2);
      table.appendChild(tr);
    }
    document.getElementById('guide-content').insertAdjacentElement('afterend', table);
  }

  // Official teams
  const officialWrap = document.getElementById('official-teams');
  if (officialTeams.length) {
    officialWrap.innerHTML = '';
    for (const team of officialTeams) {
      officialWrap.appendChild(renderTeamCard(team, cardMap, { showNote: true, maps: cardMaps, official: true }));
    }
  } else {
    officialWrap.innerHTML = '<p class="guide-preview">尚未提供推薦隊伍。</p>';
  }

  // My teams
  const myTeamsHost = document.getElementById('my-teams-list');
  const { handleAdd } = await renderMyTeamsSection(myTeamsHost, stageId, cardMap, cardMaps);
  document.getElementById('add-team-btn').addEventListener('click', handleAdd);
}

init();
