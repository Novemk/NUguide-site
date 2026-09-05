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

    for (const chapter of chapterOrder) {
      // Every non-hidden stage in this chapter is listed (not just the
      // ones with a saved team) — the ones without a team just render
      // as plain disabled text instead of a clickable tab, per the
      // 灰色/無法點擊 requirement, so you can see at a glance which of
      // this chapter's stages you haven't recorded a team for yet.
      const chapterStages = stages
        .filter((s) => s.chapter === chapter && !s.hidden)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

      // Same row-grouping rule as 關卡攻略's own button grid (see
      // stagesList.js/stageAdmin.js's 另起一排) — same underlying data,
      // so the layout reads the same way on both pages.
      const rows = [];
      let currentRow = [];
      for (const s of chapterStages) {
        if (s.rowBreak && currentRow.length > 0) { rows.push(currentRow); currentRow = []; }
        currentRow.push(s);
      }
      if (currentRow.length) rows.push(currentRow);

      const chapterEl = document.createElement('div');
      chapterEl.className = 'chapter-group';
      const titleEl = document.createElement('div');
      titleEl.className = 'chapter-title';
      titleEl.textContent = chapter;
      chapterEl.appendChild(titleEl);

      const wrapEl = document.createElement('div');
      wrapEl.className = 'mt-tab-wrap';

      const activeStageId = openStageByChapter.get(chapter) || null;

      for (const row of rows) {
        const rowEl = document.createElement('div');
        rowEl.className = 'mt-tab-row';
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
        // "查看攻略" only appears on the row containing the currently
        // open stage — mirrors 關卡攻略's own button row layout, where
        // the link always points at whichever stage is actually active.
        if (row.some((s) => s.id === activeStageId)) {
          const link = document.createElement('a');
          link.href = `stage-detail.html?id=${encodeURIComponent(activeStageId)}`;
          link.className = 'mt-tab-link';
          link.textContent = '查看攻略 →';
          rowEl.appendChild(link);
        }
        wrapEl.appendChild(rowEl);
      }
      chapterEl.appendChild(wrapEl);

      if (activeStageId) {
        const team = teamByStageId.get(activeStageId);
        const panel = document.createElement('div');
        panel.className = 'mt-tab-panel';
        // Scaled-down members-only preview (see .mt-tab-panel in
        // components.css) — no name (per the earlier discussion), no
        // note either, since the note is really about explaining a
        // specific team's approach and there's no name to give it
        // context without.
        panel.appendChild(renderTeamCard(team, cardMap, { maps: cardMaps, showName: false, showNote: false }));

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
        panel.appendChild(footer);
        chapterEl.appendChild(panel);
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
