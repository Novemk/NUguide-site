// src/pages/myTeamsOverview.js
import { loadJSON, DataSources, toMap } from '../core/dataLoader.js';
import { mountNavbar, mountFooter } from '../components/Navbar.js';
import { getAllTeamsGrouped, deleteTeam } from '../core/store.js';
import { renderTeamCard } from '../components/TeamCard.js';
import { openTeamEditor } from '../components/TeamEditor.js';
import { confirmDialog } from '../components/Modal.js';
import { showToast } from '../core/toast.js';
import { downloadTeamsBackup, promptImportTeamsBackup } from '../modules/teamBackup.js';

async function init() {
  mountNavbar('my-teams.html');
  mountFooter();

  const [stages, cards, rarities, classes, elements, siteSettings] = await Promise.all([
    loadJSON(DataSources.stages),
    loadJSON(DataSources.cards),
    loadJSON(DataSources.rarities),
    loadJSON(DataSources.classes),
    loadJSON(DataSources.elements),
    loadJSON(DataSources.siteSettings).catch(() => null),
  ]);
  if (siteSettings && siteSettings.myTeamsDescription) {
    const descEl = document.getElementById('my-teams-description');
    if (descEl) descEl.innerHTML = siteSettings.myTeamsDescription;
  }
  const stageMap = toMap(stages);
  const cardMap = toMap(cards);
  const cardMaps = { rarityMap: toMap(rarities), classMap: toMap(classes), elementMap: toMap(elements) };
  const root = document.getElementById('overview-root');

  // Which stage is currently "open" within each chapter — a Map keyed
  // by chapter name, one open stage at a time per chapter (opening a
  // new one in the same chapter auto-closes the previous one); a
  // different chapter's own open stage is unaffected.
  const openStageByChapter = new Map();
  // Independent of which stage/tab is open — per-stage flag for
  // whether that stage's single team has been clicked open to show
  // its full detail (name/note/修改/刪除). Selecting a tab only reveals
  // the collapsed avatar-row preview; the detail is a second, separate
  // click on that preview, same two-step interaction as the old
  // accordion version of this page.
  const openTeamDetail = new Set();

  async function refresh() {
    const grouped = await getAllTeamsGrouped();
    root.innerHTML = '';

    // Only one team per stage now (MAX_TEAMS_PER_STAGE = 1 — see
    // store.js) — take that single team directly rather than an array.
    const teamByStageId = new Map();
    for (const entry of grouped) {
      const stage = stageMap.get(entry.stageId);
      // Stage data itself is gone (deleted from the admin), or hidden —
      // the player's own saved record still exists in their browser,
      // this page just has nothing meaningful to show it under, same
      // as everywhere else this situation comes up on the site.
      if (!stage || stage.hidden) continue;
      if (entry.teams && entry.teams[0]) teamByStageId.set(entry.stageId, entry.teams[0]);
    }

    if (teamByStageId.size === 0) {
      root.innerHTML = `
        <div class="empty-state">
          <h3>還沒有任何隊伍紀錄</h3>
          <p>前往任一關卡的攻略頁面，建立你的第一組隊伍。</p>
          <a href="stages.html" class="btn btn-primary" style="margin-top:14px; display:inline-flex;">前往關卡列表</a>
        </div>`;
      return;
    }

    // Only chapters that actually have at least one saved team show up
    // here at all — a chapter the player has never touched doesn't
    // clutter this page just because it exists on the site.
    const chaptersWithTeams = new Set();
    for (const stageId of teamByStageId.keys()) {
      chaptersWithTeams.add(stageMap.get(stageId).chapter);
    }
    // Preserve stages.json's own chapter ordering, not alphabetical.
    const chapterOrder = [];
    const seenChapters = new Set();
    for (const s of stages) {
      if (chaptersWithTeams.has(s.chapter) && !seenChapters.has(s.chapter)) {
        seenChapters.add(s.chapter);
        chapterOrder.push(s.chapter);
      }
    }

    // Group every chapter's stages into rows (same rowBreak rule as
    // 關卡攻略's own button grid) — one bordered box per row, not per
    // chapter, since 7-1 and 8-1/8-2/8-3 are visually separate boxes
    // even though both sit under the same "忘卻遺跡" title.
    const rowsByChapter = new Map();
    for (const chapter of chapterOrder) {
      const chapterStages = stages
        .filter((s) => s.chapter === chapter && !s.hidden)
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

    // Fixed width per tab column (px) — a tab's size never depends on
    // its own label length or how many stages share its row.
    const TAB_COL_WIDTH = '64px';

    for (const chapter of chapterOrder) {
      const rows = rowsByChapter.get(chapter);

      const chapterEl = document.createElement('div');
      chapterEl.className = 'chapter-group';
      const titleEl = document.createElement('div');
      titleEl.className = 'chapter-title';
      titleEl.textContent = chapter;
      chapterEl.appendChild(titleEl);

      const activeStageId = openStageByChapter.get(chapter) || null;

      // One bordered box PER ROW (not one box for the whole chapter) —
      // 7-1 and 8-1/8-2/8-3 are visually separate boxes even though
      // they're both under the same "忘卻遺跡" title. Whichever row
      // contains the currently-open stage gets its "查看攻略" link and
      // the team panel appended inside that same row's own box; other
      // rows in the chapter are untouched by that.
      for (const row of rows) {
        const boxEl = document.createElement('div');
        boxEl.className = 'mt-chapter-box';

        // Every real stage gets a fixed-width column, with a separator
        // track between each pair (mirrors the '｜' glyph rendered
        // below). The grid itself is only ever as wide as this row's
        // own tabs need — the box (see .mt-chapter-box) stays full
        // width (640px, same as the site's tables/team cards) and the
        // grid sits left-aligned inside it, so whatever's left over on
        // the right is just blank box, which is also where the
        // "查看攻略" link lands (see .mt-tab-toprow below).
        const gridTemplate = Array.from({ length: row.length }, () => TAB_COL_WIDTH).join(' auto ');

        const rowEl = document.createElement('div');
        rowEl.className = 'mt-tab-row';
        rowEl.style.gridTemplateColumns = gridTemplate;
        row.forEach((s, i) => {
          if (i > 0) {
            const sep = document.createElement('span');
            sep.className = 'mt-tab-sep';
            sep.textContent = '｜';
            rowEl.appendChild(sep);
          }
          if (!teamByStageId.has(s.id)) {
            const span = document.createElement('span');
            span.className = 'mt-tab mt-tab-disabled';
            span.textContent = s.order;
            rowEl.appendChild(span);
          } else {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'mt-tab' + (activeStageId === s.id ? ' active' : '');
            btn.textContent = s.order;
            btn.addEventListener('click', () => {
              openStageByChapter.set(chapter, activeStageId === s.id ? null : s.id);
              refresh();
            });
            rowEl.appendChild(btn);
          }
        });

        const wrapEl = document.createElement('div');
        wrapEl.className = 'mt-tab-wrap';

        // Tabs and the "查看攻略" link share one line (see
        // .mt-tab-toprow) — the link is only added as a second flex
        // child when this row has the open stage, so on an inactive
        // row the tab grid just sits alone at the left with nothing
        // pushed to the right.
        const topRow = document.createElement('div');
        topRow.className = 'mt-tab-toprow';
        topRow.appendChild(rowEl);

        const rowHasActiveStage = row.some((s) => s.id === activeStageId);
        if (rowHasActiveStage) {
          const link = document.createElement('a');
          link.href = `stage-detail.html?id=${encodeURIComponent(activeStageId)}`;
          link.className = 'mt-tab-link';
          link.textContent = '查看攻略 →';
          topRow.appendChild(link);
        }
        wrapEl.appendChild(topRow);
        boxEl.appendChild(wrapEl);

        if (rowHasActiveStage) {
          const team = teamByStageId.get(activeStageId);
          const panel = document.createElement('div');
          panel.className = 'mt-tab-panel';

          const isDetailOpen = openTeamDetail.has(activeStageId);

          // Step 1 of the two-step reveal: a clickable avatar-only
          // preview (no name/note/buttons yet). Clicking it toggles the
          // detail below, same as the old accordion's team-row preview.
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

          // Step 2: only once the preview above has been clicked open —
          // name, note, and the 修改/刪除 actions (複製 removed per
          // 2026-09-05 request, both here and in myTeamsSection.js).
          if (isDetailOpen) {
            const detail = document.createElement('div');
            detail.className = 'mt-team-detail';

            const name = document.createElement('div');
            name.className = 'team-card-name';
            name.style.marginBottom = '6px';
            name.textContent = team.name;
            detail.appendChild(name);

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

  document.getElementById('export-btn').addEventListener('click', () => downloadTeamsBackup());
  document.getElementById('import-btn').addEventListener('click', async () => {
    const merge = confirmDialog('選擇「確定」以合併匯入（保留現有隊伍並更新同名紀錄）；選擇「取消」則改為覆蓋匯入（清空後套用備份內容）。');
    const ok = await promptImportTeamsBackup(merge ? 'merge' : 'replace');
    if (ok) refresh();
  });

  await refresh();
}

init();
