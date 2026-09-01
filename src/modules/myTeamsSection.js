// src/modules/myTeamsSection.js
import { getTeams, deleteTeam, duplicateTeam } from '../core/store.js';
import { openTeamEditor } from '../components/TeamEditor.js';
import { renderTeamCard } from '../components/TeamCard.js';
import { confirmDialog } from '../components/Modal.js';
import { showToast } from '../core/toast.js';

/**
 * @param {HTMLElement} container
 * @param {string} stageId
 * @param {Map} cardMap
 */
export async function renderMyTeamsSection(container, stageId, cardMap) {
  async function refresh() {
    const teams = await getTeams(stageId);
    container.innerHTML = '';

    if (teams.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = '<h3>還沒有隊伍紀錄</h3><p>建立一組隊伍，記錄你在這關使用的隊員。</p>';
      container.appendChild(empty);
    } else {
      for (const team of teams) {
        container.appendChild(renderTeamCard(team, cardMap, {
          actions: [
            { label: '修改', className: 'btn btn-sm', onClick: () => handleEdit(team) },
            { label: '複製', className: 'btn btn-sm btn-secondary', onClick: () => handleDuplicate(team) },
            { label: '刪除', className: 'btn btn-sm btn-danger', onClick: () => handleDelete(team) },
          ],
        }));
      }
    }
  }

  async function handleAdd() {
    await openTeamEditor(stageId, null);
    refresh();
  }

  async function handleEdit(team) {
    await openTeamEditor(stageId, team);
    refresh();
  }

  async function handleDuplicate(team) {
    await duplicateTeam(stageId, team.localId);
    showToast('已複製隊伍');
    refresh();
  }

  async function handleDelete(team) {
    if (!confirmDialog(`確定要刪除「${team.name}」嗎？此動作無法復原。`)) return;
    await deleteTeam(stageId, team.localId);
    showToast('已刪除隊伍');
    refresh();
  }

  await refresh();
  return { refresh, handleAdd };
}
