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
      const block = document.createElement('div');
      block.className = 'section';

      const titleRow = document.createElement('div');
      titleRow.className = 'section-title';
      titleRow.innerHTML = `<h2>${stage ? `${stage.chapter} ${stage.order} ${stage.title}` : entry.stageId}</h2>`;
      if (stage) {
        const link = document.createElement('a');
        link.href = `stage-detail.html?id=${encodeURIComponent(stage.id)}`;
        link.className = 'btn btn-sm btn-secondary';
        link.textContent = '查看攻略 →';
        link.style.flexShrink = '0';
        titleRow.appendChild(link);
      }
      block.appendChild(titleRow);

      for (const team of entry.teams) {
        block.appendChild(renderTeamCard(team, cardMap, {
          maps: cardMaps,
          actions: [
            { label: '修改', className: 'btn btn-sm', onClick: () => handleEdit(entry.stageId, team) },
            { label: '複製', className: 'btn btn-sm btn-secondary', onClick: () => handleDuplicate(entry.stageId, team) },
            { label: '刪除', className: 'btn btn-sm btn-danger', onClick: () => handleDelete(entry.stageId, team) },
          ],
        }));
      }

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
