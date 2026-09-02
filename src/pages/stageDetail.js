// src/pages/stageDetail.js
import { loadJSON, DataSources, toMap, resolveAsset } from '../core/dataLoader.js';
import { mountNavbar, mountFooter } from '../components/Navbar.js';
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

  const [stages, stageTeams, tags, cards, elements] = await Promise.all([
    loadJSON(DataSources.stages),
    loadJSON(DataSources.stageTeams),
    loadJSON(DataSources.tags),
    loadJSON(DataSources.cards),
    loadJSON(DataSources.elements),
  ]);

  const stage = stages.find((s) => s.id === stageId);
  if (!stage) {
    root.innerHTML = '<div class="empty-state"><h3>找不到這個關卡</h3><p>可能已被移除，請回到關卡列表重新選擇。</p></div>';
    return;
  }

  const tagMap = toMap(tags);
  const cardMap = toMap(cards);
  const elementMap = toMap(elements);
  const officialTeams = (stageTeams.find((t) => t.stageId === stageId) || {}).teams || [];

  document.title = `${stage.order} ${stage.title} | 流光秘境攻略`;

  document.getElementById('stage-header').innerHTML = `
    <div class="page-eyebrow">${stage.chapter} · ${stage.order}</div>
    <h1>${stage.title}</h1>
  `;

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

  // Recommended abilities
  const recTags = (stage.recommendedTags || []).map((id) => tagMap.get(id)).filter(Boolean);
  const recWrap = document.getElementById('recommended-tags');
  recWrap.innerHTML = recTags.length
    ? recTags.map((t) => `<span class="tag-pill"><img src="${resolveAsset(t.icon)}" alt="">${t.label}</span>`).join('')
    : '<p class="guide-preview">尚未設定推薦能力。</p>';

  // Official teams
  const officialWrap = document.getElementById('official-teams');
  if (officialTeams.length) {
    officialWrap.innerHTML = '';
    for (const team of officialTeams) {
      officialWrap.appendChild(renderTeamCard(team, cardMap, { showNote: true }));
    }
  } else {
    officialWrap.innerHTML = '<p class="guide-preview">尚未提供官方推薦隊伍。</p>';
  }

  // My teams
  const myTeamsHost = document.getElementById('my-teams-list');
  const { handleAdd } = await renderMyTeamsSection(myTeamsHost, stageId, cardMap);
  document.getElementById('add-team-btn').addEventListener('click', handleAdd);
}

init();
