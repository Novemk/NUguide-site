// src/pages/modTeamsView.js
// 版主的隊伍 — 唯讀展示頁 (2026-09-09)。只有站主自己在後台「版主的
// 隊伍」編輯過、發布出去的資料，這裡才會顯示；沒有紀錄的關卡不會出現
// 在清單裡（跟後台那頁「列出全部關卡」不一樣，那邊是編輯用途，這裡是
// 給人看的）。分「當季」「過往關卡」兩區，比照「關卡攻略」；清單本身
// 是「點關卡編號才展開」的頁籤式清單，跟「隊伍筆記」「我的隊伍總覽」
// 同一套 .mt-tab-row/.mt-tab-panel 排版，不是整頁攤開全部隊伍
// (2026-09-09 修正：原本是一次全部展開，關卡一多要一直往下滑)；展開
// 後的內容（敵人頭像列→分隔線→隊伍卡片→回合表）比照「隊伍筆記」。
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

const TAB_COL_WIDTH = '104px';

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
  if (siteSettings && siteSettings.modTeamsDescription) {
    const descEl = document.getElementById('mod-teams-description');
    if (descEl) descEl.innerHTML = siteSettings.modTeamsDescription;
  }
  const root = document.getElementById('mv-root');

  const recordedStages = stages.filter((s) => !s.hidden && modTeams[s.id]);
  const activeStages = recordedStages.filter((s) => !s.archived);
  const pastStages = recordedStages.filter((s) => s.archived);

  // 每個區塊（當季／過往）各自記自己的「目前展開哪一關」，兩區互不
  // 影響——跟「隊伍筆記」的 openStageByChapter 同一種做法，只是這裡
  // 一頁有兩區，所以各開一份。key 是章節名稱，value 是那個章節目前展
  // 開的 stage id（null＝全部收合）。
  const activeOpenByChapter = new Map();
  const pastOpenByChapter = new Map();

  function groupByChapter(list) {
    const chapters = [];
    const idx = new Map();
    for (const s of list) {
      if (!idx.has(s.chapter)) { idx.set(s.chapter, { chapter: s.chapter, stages: [] }); chapters.push(idx.get(s.chapter)); }
      idx.get(s.chapter).stages.push(s);
    }
    return sortBySeriesOrder(chapters, seriesOrder, (g) => g.chapter);
  }

  // 展開後的內容——跟「隊伍筆記」同一種排法（敵人列→分隔線→隊伍卡
  // 片→回合表），不重複印關卡編號（頁籤按鈕本身已經顯示了）。
  function renderStageContent(stage) {
    const data = modTeams[stage.id];
    const panel = document.createElement('div');
    panel.className = 'mt-tab-panel';

    if (stage.enemies && stage.enemies.length) {
      const enemyRow = document.createElement('div');
      enemyRow.className = 'tn-enemy-row';
      for (const enemy of stage.enemies) enemyRow.appendChild(renderEnemyChip(enemy, elementMap));
      panel.appendChild(enemyRow);
      const divider = document.createElement('div');
      divider.className = 'tn-enemy-divider';
      panel.appendChild(divider);
    }

    if (data.members && data.members.some(Boolean)) {
      const teamEl = renderTeamCard({ name: '', members: data.members }, cardMap, {
        maps: cardMaps,
        showName: false,
      });
      panel.appendChild(teamEl);
    }

    const table = renderRoundTable(data.roundTable);
    if (table) panel.appendChild(table);

    return panel;
  }

  function renderSection(title, list, openByChapter) {
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

      // 同一章節內按 rowBreak 分成好幾排頁籤——跟「隊伍筆記」/「我的
      // 隊伍總覽」同一套排法，關卡數一多才不會擠成一長條。
      const chapterStages = [...group.stages].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      const rows = [];
      let currentRow = [];
      for (const s of chapterStages) {
        if (s.rowBreak && currentRow.length > 0) { rows.push(currentRow); currentRow = []; }
        currentRow.push(s);
      }
      if (currentRow.length) rows.push(currentRow);

      const activeStageId = openByChapter.get(group.chapter) || null;

      for (const row of rows) {
        const boxEl = document.createElement('div');
        boxEl.className = 'mt-chapter-box';

        const gridTemplate = Array.from({ length: row.length }, () => TAB_COL_WIDTH).join(' ');
        const rowEl = document.createElement('div');
        rowEl.className = 'mt-tab-row';
        rowEl.style.gridTemplateColumns = gridTemplate;
        row.forEach((s, i) => {
          const cell = document.createElement('div');
          cell.className = 'mt-tab-cell';
          if (i > 0) {
            const prevActive = row[i - 1].id === activeStageId;
            const thisActive = s.id === activeStageId;
            if (!prevActive && !thisActive) cell.classList.add('sep-left');
          }
          if (activeStageId === s.id) cell.classList.add('active');
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'mt-tab';
          btn.textContent = s.order;
          btn.addEventListener('click', () => {
            openByChapter.set(group.chapter, activeStageId === s.id ? null : s.id);
            refresh();
          });
          cell.appendChild(btn);
          rowEl.appendChild(cell);
        });

        const wrapEl = document.createElement('div');
        wrapEl.className = 'mt-tab-wrap';
        const topRow = document.createElement('div');
        topRow.className = 'mt-tab-toprow';
        const scrollEl = document.createElement('div');
        scrollEl.className = 'mt-tab-scroll';
        scrollEl.appendChild(rowEl);
        topRow.appendChild(scrollEl);
        wrapEl.appendChild(topRow);
        boxEl.appendChild(wrapEl);

        const activeStage = row.find((s) => s.id === activeStageId);
        if (activeStage) boxEl.appendChild(renderStageContent(activeStage));

        chapterEl.appendChild(boxEl);
      }

      root.appendChild(chapterEl);
    }
  }

  function refresh() {
    root.innerHTML = '';
    if (recordedStages.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'form-hint';
      empty.textContent = '目前還沒有任何紀錄。';
      root.appendChild(empty);
      return;
    }
    renderSection('當季', activeStages, activeOpenByChapter);
    renderSection('過往關卡', pastStages, pastOpenByChapter);
  }

  refresh();
}

init();
