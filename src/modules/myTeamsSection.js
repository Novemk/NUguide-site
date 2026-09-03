// src/modules/myTeamsSection.js
import { getTeams, deleteTeam, duplicateTeam, MAX_TEAMS_PER_STAGE } from '../core/store.js';
import { openTeamEditor } from '../components/TeamEditor.js';
import { renderTeamCard } from '../components/TeamCard.js';
import { confirmDialog } from '../components/Modal.js';
import { showToast } from '../core/toast.js';

/**
 * @param {HTMLElement} container
 * @param {string} stageId
 * @param {Map} cardMap
 * @param {{rarityMap?:Map, elementMap?:Map, classMap?:Map}} [maps] - passed
 *   through to TeamCard/TeamEditor so the card face shows the same
 *   屬性/定位/稀有度 badges as everywhere else on the site.
 */
export async function renderMyTeamsSection(container, stageId, cardMap, maps) {
  async function refresh() {
    const teams = await getTeams(stageId);
    container.innerHTML = '';

    // The "+ 新增隊伍" button lives outside this module (in stage-detail.html
    // / stageDetail.js), so it's looked up by its known id here rather than
    // threading a reference through — same pattern as elsewhere on this page.
    const addBtn = document.getElementById('add-team-btn');
    if (addBtn) {
      const atCap = teams.length >= MAX_TEAMS_PER_STAGE;
      addBtn.disabled = atCap;
      addBtn.title = atCap ? `每個關卡最多只能建立 ${MAX_TEAMS_PER_STAGE} 組隊伍` : '';
    }

    if (teams.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = '<h3>還沒有隊伍紀錄</h3><p>建立一組隊伍，記錄你在這關使用的隊員。</p>';
      container.appendChild(empty);
    } else {
      for (const team of teams) {
        container.appendChild(renderTeamCard(team, cardMap, {
          maps,
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
    const teams = await getTeams(stageId);
    if (teams.length >= MAX_TEAMS_PER_STAGE) {
      showToast(`每個關卡最多只能建立 ${MAX_TEAMS_PER_STAGE} 組隊伍`, { type: 'error' });
      return;
    }
    await openTeamEditor(stageId, null);
    refresh();
  }

  async function handleEdit(team) {
    await openTeamEditor(stageId, team);
    refresh();
  }

  async function handleDuplicate(team) {
    const teams = await getTeams(stageId);
    if (teams.length >= MAX_TEAMS_PER_STAGE) {
      showToast(`每個關卡最多只能建立 ${MAX_TEAMS_PER_STAGE} 組隊伍`, { type: 'error' });
      return;
    }
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
