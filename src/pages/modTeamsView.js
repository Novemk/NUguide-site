// src/pages/modTeamsView.js
// 版主的隊伍 — 唯讀展示頁 (2026-09-09)。只有站主自己在後台「版主的
// 隊伍」編輯過、發布出去的資料，這裡才會顯示；沒有紀錄的關卡不會出現
// 在清單裡（跟後台那頁「列出全部關卡」不一樣，那邊是編輯用途，這裡是
// 給人看的）。分「當季」「過往關卡」兩區，比照「關卡攻略」；每一關的
// 呈現方式（敵人頭像列→分隔線→隊伍卡片→回合表）比照「隊伍筆記」。
import { loadJSON, DataSources, toMap } from '../core/dataLoader.js';
import { mountNavbar, mountFooter } from '../components/Navbar.js';
import { renderTeamCard } from '../components/TeamCard.js';
import { renderEnemyChip } from '../components/EnemyPortrait.js';

function seriesOf(chapter) {
  const idx = (chapter || '').indexOf(' ');
  return idx === -1 ? (chapter || '') : chapter.slice(0, idx);
}
function sortBySeriesOrder(items, seriesOrder, chapterOf) {
  if (!seriesOrder || !seriesOrder.length) return items;
  const rank = new Map(seriesOrder.map((s, i) => [s, i]));
  return [...items].sort((a, b) => {
    const ra = rank.has(seriesOf(chapterOf(a))) ? rank.get(seriesOf(chapterOf(a))) : Infinity;
    const rb = rank.has(seriesOf(chapterOf(b))) ? rank.get(seriesOf(chapterOf(b))) : Infinity;
    return ra - rb;
  });
}

function renderRoundTable(rows) {
  if (!rows || !rows.length) return null;
  const table = document.createElement('table');
  table.className = 'rt-table';
  for (const row of rows) {
    const tr = document.createElement('tr');
    const td1 = document.createElement('td');
    td1.innerHTML = row.col1 || '';
    const td2 = document.createElement('td');
    td2.innerHTML = row.col2 || '';
    tr.append(td1, td2);
    table.appendChild(tr);
  }
  return table;
}

async function init() {
  mountNavbar('mod-teams.html');
  mountFooter();

  const [stages, cards, rarities, classes, elements, siteSettings, modTeams] = await Promise.all([
    loadJSON(DataSources.stages),
    loadJSON(DataSources.cards),
    loadJSON(DataSources.rarities),
    loadJSON(DataSources.classes),
    loadJSON(DataSources.elements),
    loadJSON(DataSources.siteSettings).catch(() => null),
    loadJSON(DataSources.modTeams).catch(() => ({})),
  ]);
  const cardMap = toMap(cards);
  const cardMaps = { rarityMap: toMap(rarities), classMap: toMap(classes), elementMap: toMap(elements) };
  const elementMap = cardMaps.elementMap;
  const seriesOrder = (siteSettings && siteSettings.seriesOrder) || [];
  const root = document.getElementById('mv-root');
  root.innerHTML = '';

  const recordedStages = stages.filter((s) => !s.hidden && modTeams[s.id]);
  const activeStages = recordedStages.filter((s) => !s.archived);
  const pastStages = recordedStages.filter((s) => s.archived);

  function groupByChapter(list) {
    const chapters = [];
    const idx = new Map();
    for (const s of list) {
      if (!idx.has(s.chapter)) { idx.set(s.chapter, { chapter: s.chapter, stages: [] }); chapters.push(idx.get(s.chapter)); }
      idx.get(s.chapter).stages.push(s);
    }
    return sortBySeriesOrder(chapters, seriesOrder, (g) => g.chapter);
  }

  function renderStageBlock(stage) {
    const data = modTeams[stage.id];
    const block = document.createElement('div');
    block.className = 'mv-stage-block';

    const heading = document.createElement('h3');
    heading.className = 'mv-stage-heading';
    heading.textContent = stage.order;
    block.appendChild(heading);

    if (stage.enemies && stage.enemies.length) {
      const enemyRow = document.createElement('div');
      enemyRow.className = 'tn-enemy-row';
      for (const enemy of stage.enemies) enemyRow.appendChild(renderEnemyChip(enemy, elementMap));
      block.appendChild(enemyRow);
      const divider = document.createElement('div');
      divider.className = 'tn-enemy-divider';
      block.appendChild(divider);
    }

    if (data.members && data.members.some(Boolean)) {
      const teamEl = renderTeamCard({ name: '', members: data.members }, cardMap, {
        maps: cardMaps,
        showName: false,
      });
      block.appendChild(teamEl);
    }

    const table = renderRoundTable(data.roundTable);
    if (table) block.appendChild(table);

    return block;
  }

  function renderSection(title, list) {
    if (!list.length) return;
    const sectionTitle = document.createElement('h2');
    sectionTitle.className = 'mv-section-title';
    sectionTitle.textContent = title;
    root.appendChild(sectionTitle);
    for (const group of groupByChapter(list)) {
      const chapterEl = document.createElement('div');
      chapterEl.className = 'chapter-group';
      const chapterTitle = document.createElement('div');
      chapterTitle.className = 'chapter-title';
      chapterTitle.textContent = group.chapter;
      chapterEl.appendChild(chapterTitle);
      for (const stage of group.stages) chapterEl.appendChild(renderStageBlock(stage));
      root.appendChild(chapterEl);
    }
  }

  if (recordedStages.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'form-hint';
    empty.textContent = '目前還沒有任何紀錄。';
    root.appendChild(empty);
  } else {
    renderSection('當季', activeStages);
    renderSection('過往關卡', pastStages);
  }
}

init();
