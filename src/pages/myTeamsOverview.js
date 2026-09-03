// src/pages/myTeamsOverview.js
import { loadJSON, DataSources, toMap } from '../core/dataLoader.js';
import { mountNavbar, mountFooter } from '../components/Navbar.js';
import { getAllTeamsGrouped, deleteTeam, duplicateTeam } from '../core/store.js';
import { renderTeamCard } from '../components/TeamCard.js';
import { openTeamEditor } from '../components/TeamEditor.js';
import { confirmDialog } from '../components/Modal.js';
import { showToast } from '../core/toast.js';
import { downloadTeamsBackup, promptImportTeamsBackup } from '../modules/teamBackup.js';

async function init() {
  mountNavbar('my-teams.html');
  mountFooter();

  const [stages, cards, rarities, classes, elements] = await Promise.all([
    loadJSON(DataSources.stages),
    loadJSON(DataSources.cards),
    loadJSON(DataSources.rarities),
    loadJSON(DataSources.classes),
    loadJSON(DataSources.elements),
  ]);
  const stageMap = toMap(stages);
  const cardMap = toMap(cards);
  const cardMaps = { rarityMap: toMap(rarities), classMap: toMap(classes), elementMap: toMap(elements) };
  const root = document.getElementById('overview-root');

  // Which stage sections are expanded, and — independently, per stage —
  // which single team (if any) is expanded to show its name/note/actions.
  // Kept outside refresh() so the accordion state survives a refresh
  // (e.g. after editing a team) instead of collapsing everything back.
  const openStages = new Set();
  const openTeamByStage = new Map(); // stageId -> team.localId | null

  async function refresh() {
    const grouped = await getAllTeamsGrouped();
    root.innerHTML = '';

    if (grouped.length === 0) {
      root.innerHTML = `
        <div class="empty-state">
          <h3>還沒有任何隊伍紀錄</h3>
          <p>前往任一關卡的攻略頁面，建立你的第一組隊伍。</p>
          <a href="stages.html" class="btn btn-primary" style="margin-top:14px; display:inline-flex;">前往關卡列表</a>
        </div>`;
      return;
    }

    for (const entry of grouped) {
      const stage = stageMap.get(entry.stageId);
      const stageTitle = stage ? `${stage.chapter} ${stage.order} ${stage.title}` : entry.stageId;
      const isStageOpen = openStages.has(entry.stageId);

      const block = document.createElement('div');
      block.className = 'section mt-stage-block' + (isStageOpen ? ' open' : '');

      const titleRow = document.createElement('div');
      titleRow.className = 'section-title';

      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'mt-stage-toggle';
      toggleBtn.innerHTML = `<span class="mt-stage-caret">▶</span><span>${stageTitle}</span>`;
      toggleBtn.addEventListener('click', () => {
        if (openStages.has(entry.stageId)) openStages.delete(entry.stageId);
        else openStages.add(entry.stageId);
        refresh();
      });
      titleRow.appendChild(toggleBtn);

      if (stage) {
        const link = document.createElement('a');
        link.href = `stage-detail.html?id=${encodeURIComponent(stage.id)}`;
        link.className = 'btn btn-sm btn-secondary';
        link.textContent = '查看攻略 →';
        link.style.flexShrink = '0';
        link.style.marginLeft = 'auto';
        titleRow.appendChild(link);
      }
      block.appendChild(titleRow);

      const panel = document.createElement('div');
      panel.className = 'mt-stage-panel';

      const activeTeamId = openTeamByStage.get(entry.stageId) ?? null;
      entry.teams.forEach((team, teamIndex) => {
        const row = document.createElement('div');
        row.className = 'mt-team-row';

        const rowMain = document.createElement('div');
        rowMain.className = 'mt-team-row-main';

        const numberBadge = document.createElement('div');
        numberBadge.className = 'mt-team-number';
        numberBadge.textContent = String(teamIndex + 1);
        rowMain.appendChild(numberBadge);

        // Collapsed preview — member avatars only, no name/note/buttons,
        // per request. Clicking it expands (or, if already the open one,
        // collapses) this team's full detail below.
        const previewBtn = document.createElement('button');
        previewBtn.type = 'button';
        previewBtn.className = 'mt-team-preview-btn';
        previewBtn.setAttribute('aria-label', `${team.name}：${activeTeamId === team.localId ? '收合' : '展開'}隊伍內容`);
        previewBtn.appendChild(renderTeamCard(team, cardMap, { maps: cardMaps, showName: false, showNote: false }));
        previewBtn.addEventListener('click', () => {
          openTeamByStage.set(entry.stageId, activeTeamId === team.localId ? null : team.localId);
          refresh();
        });
        rowMain.appendChild(previewBtn);
        row.appendChild(rowMain);

        if (activeTeamId === team.localId) {
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
            { label: '修改', className: 'btn btn-sm', onClick: () => handleEdit(entry.stageId, team) },
            { label: '複製', className: 'btn btn-sm btn-secondary', onClick: () => handleDuplicate(entry.stageId, team) },
            { label: '刪除', className: 'btn btn-sm btn-danger', onClick: () => handleDelete(entry.stageId, team) },
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
          row.appendChild(detail);
        }

        panel.appendChild(row);
      });
      block.appendChild(panel);
      root.appendChild(block);
    }
  }

  async function handleEdit(stageId, team) {
    await openTeamEditor(stageId, team);
    refresh();
  }
  async function handleDuplicate(stageId, team) {
    await duplicateTeam(stageId, team.localId);
    showToast('已複製隊伍');
    refresh();
  }
  async function handleDelete(stageId, team) {
    if (!confirmDialog(`確定要刪除「${team.name}」嗎？此動作無法復原。`)) return;
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
