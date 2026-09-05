// src/pages/teamNotes.js
// 隊伍筆記 — same underlying team data and interaction pattern as
// myTeamsOverview.js (頁籤 → 隊伍頭像預覽 → 展開細節), just a different
// slice of stages (archived ones only) and a lighter panel: an enemy
// row up top (icon+name, no 查看攻略 recommended-team detail), no team
// name field, no link out to a full guide page. See stageAdmin.js's
// 過往關卡 checkbox for how a stage ends up on this page instead of
// 我的隊伍總覽.
import { loadJSON, DataSources, toMap } from '../core/dataLoader.js';
import { mountNavbar, mountFooter } from '../components/Navbar.js';
import { getAllTeamsGrouped, deleteTeam } from '../core/store.js';
import { renderTeamCard } from '../components/TeamCard.js';
import { renderEnemyChip } from '../components/EnemyPortrait.js';
import { openTeamEditor } from '../components/TeamEditor.js';
import { confirmDialog } from '../components/Modal.js';
import { showToast } from '../core/toast.js';

async function init() {
  mountNavbar('team-notes.html');
  mountFooter();

  const [stages, cards, rarities, classes, elements, siteSettings] = await Promise.all([
    loadJSON(DataSources.stages),
    loadJSON(DataSources.cards),
    loadJSON(DataSources.rarities),
    loadJSON(DataSources.classes),
    loadJSON(DataSources.elements),
    loadJSON(DataSources.siteSettings).catch(() => null),
  ]);
  if (siteSettings && siteSettings.teamNotesDescription) {
    const descEl = document.getElementById('team-notes-description');
    if (descEl) descEl.innerHTML = siteSettings.teamNotesDescription;
  }
  const stageMap = toMap(stages);
  const cardMap = toMap(cards);
  const cardMaps = { rarityMap: toMap(rarities), classMap: toMap(classes), elementMap: toMap(elements) };
  const root = document.getElementById('notes-root');

  const openStageByChapter = new Map();
  const openTeamDetail = new Set();

  async function refresh() {
    const grouped = await getAllTeamsGrouped();
    root.innerHTML = '';

    const teamByStageId = new Map();
    for (const entry of grouped) {
      const stage = stageMap.get(entry.stageId);
      // The mirror image of myTeamsOverview.js's own filter — only
      // 過往關卡 (archived), and 隱藏 still wins if somehow both are set
      // (see stageAdmin.js's 過往關卡 checkbox note on priority).
      if (!stage || stage.hidden || !stage.archived) continue;
      if (entry.teams && entry.teams[0]) teamByStageId.set(entry.stageId, entry.teams[0]);
    }

    if (teamByStageId.size === 0) {
      root.innerHTML = `
        <div class="empty-state">
          <h3>還沒有任何筆記</h3>
          <p>把一個已經打過、暫時不想寫完整攻略的關卡標成「過往關卡」（在後台的關卡編輯頁），它就會出現在這裡。</p>
        </div>`;
      return;
    }

    const chaptersWithTeams = new Set();
    for (const stageId of teamByStageId.keys()) {
      chaptersWithTeams.add(stageMap.get(stageId).chapter);
    }
    const chapterOrder = [];
    const seenChapters = new Set();
    for (const s of stages) {
      if (chaptersWithTeams.has(s.chapter) && !seenChapters.has(s.chapter)) {
        seenChapters.add(s.chapter);
        chapterOrder.push(s.chapter);
      }
    }

    const rowsByChapter = new Map();
    for (const chapter of chapterOrder) {
      const chapterStages = stages
        .filter((s) => s.chapter === chapter && !s.hidden && s.archived)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

      const rows = [];
      let currentRow = [];
      for (const s of chapterStages) {
        if (s.rowBreak && currentRow.length > 0) { rows.push(currentRow); currentRow = []; }
        currentRow.push(s);
      }
      if (currentRow.length) rows.push(currentRow);

      rowsByChapter.set(chapter, rows);
    }

    const TAB_COL_WIDTH = '104px';

    for (const chapter of chapterOrder) {
      const rows = rowsByChapter.get(chapter);

      const chapterEl = document.createElement('div');
      chapterEl.className = 'chapter-group';
      const titleEl = document.createElement('div');
      titleEl.className = 'chapter-title';
      titleEl.textContent = chapter;
      chapterEl.appendChild(titleEl);

      const activeStageId = openStageByChapter.get(chapter) || null;

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

          if (!teamByStageId.has(s.id)) {
            cell.appendChild(Object.assign(document.createElement('span'), {
              className: 'mt-tab-disabled',
              textContent: s.order,
            }));
          } else {
            if (activeStageId === s.id) cell.classList.add('active');
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'mt-tab';
            btn.textContent = s.order;
            btn.addEventListener('click', () => {
              openStageByChapter.set(chapter, activeStageId === s.id ? null : s.id);
              refresh();
            });
            cell.appendChild(btn);
          }
          rowEl.appendChild(cell);
        });

        const wrapEl = document.createElement('div');
        wrapEl.className = 'mt-tab-wrap';

        // No 查看攻略 link on this page at all (unlike myTeamsOverview.js)
        // — this whole page is explicitly for stages that don't have
        // (or don't need) a full guide, so .mt-tab-toprow only ever
        // holds the tab strip, nothing pushed to the right of it.
        const topRow = document.createElement('div');
        topRow.className = 'mt-tab-toprow';
        const scrollEl = document.createElement('div');
        scrollEl.className = 'mt-tab-scroll';
        scrollEl.appendChild(rowEl);
        topRow.appendChild(scrollEl);
        wrapEl.appendChild(topRow);
        boxEl.appendChild(wrapEl);

        const rowHasActiveStage = row.some((s) => s.id === activeStageId);
        if (rowHasActiveStage) {
          const activeStage = row.find((s) => s.id === activeStageId);
          const team = teamByStageId.get(activeStageId);
          const panel = document.createElement('div');
          panel.className = 'mt-tab-panel';

          // Enemy row — icon + name only (see .tn-enemy-row in
          // components.css, which hides renderEnemyChip's own note
          // text and shrinks the portrait to roughly the team card's
          // own avatar size), then a divider so it doesn't visually
          // fuse with the team card below it.
          if (activeStage.enemies && activeStage.enemies.length) {
            const enemyRow = document.createElement('div');
            enemyRow.className = 'tn-enemy-row';
            for (const enemy of activeStage.enemies) {
              enemyRow.appendChild(renderEnemyChip(enemy, cardMaps.elementMap));
            }
            panel.appendChild(enemyRow);
            const divider = document.createElement('div');
            divider.className = 'tn-enemy-divider';
            panel.appendChild(divider);
          }

          const isDetailOpen = openTeamDetail.has(activeStageId);

          const previewBtn = document.createElement('button');
          previewBtn.type = 'button';
          previewBtn.className = 'mt-team-preview-btn';
          previewBtn.setAttribute('aria-label', `${isDetailOpen ? '收合' : '展開'}隊伍內容`);
          previewBtn.appendChild(renderTeamCard(team, cardMap, { maps: cardMaps, showName: false, showNote: false }));
          previewBtn.addEventListener('click', () => {
            if (openTeamDetail.has(activeStageId)) openTeamDetail.delete(activeStageId);
            else openTeamDetail.add(activeStageId);
            refresh();
          });
          panel.appendChild(previewBtn);

          // No 隊伍名稱 field shown here (per explicit request — this
          // page is "just record the team", not name it) — straight to
          // the note (筆記內文) and the 修改/刪除 actions.
          if (isDetailOpen) {
            const detail = document.createElement('div');
            detail.className = 'mt-team-detail';

            if (team.note) {
              const note = document.createElement('div');
              note.className = 'team-card-note';
              note.innerHTML = team.note;
              detail.appendChild(note);
            }

            const footer = document.createElement('div');
            footer.className = 'team-card-footer';
            footer.style.marginTop = '10px';
            const actions = [
              { label: '修改', className: 'btn btn-sm', onClick: () => handleEdit(activeStageId, team) },
              { label: '刪除', className: 'btn btn-sm btn-danger', onClick: () => handleDelete(activeStageId, team) },
            ];
            for (const action of actions) {
              const btn = document.createElement('button');
              btn.type = 'button';
              btn.className = action.className;
              btn.textContent = action.label;
              btn.addEventListener('click', () => action.onClick());
              footer.appendChild(btn);
            }
            detail.appendChild(footer);
            panel.appendChild(detail);
          }

          boxEl.appendChild(panel);
        }

        chapterEl.appendChild(boxEl);
      }

      root.appendChild(chapterEl);
    }
  }

  async function handleEdit(stageId, team) {
    await openTeamEditor(stageId, team);
    refresh();
  }
  async function handleDelete(stageId, team) {
    if (!confirmDialog('確定要刪除這組隊伍嗎？此動作無法復原。')) return;
    await deleteTeam(stageId, team.localId);
    showToast('已刪除隊伍');
    refresh();
  }

  await refresh();
}

init();
