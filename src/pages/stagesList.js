// src/pages/stagesList.js
import { loadJSON, DataSources, toMap, resolveAsset } from '../core/dataLoader.js';
import { mountNavbar, mountFooter } from '../components/Navbar.js';
import { renderEnemyPortrait } from '../components/EnemyPortrait.js';

async function init() {
  mountNavbar('stages.html');
  mountFooter();

  const [stages, tags, elements] = await Promise.all([
    loadJSON(DataSources.stages),
    loadJSON(DataSources.tags),
    loadJSON(DataSources.elements),
  ]);
  const tagMap = toMap(tags);
  const elementMap = toMap(elements);

  // Hidden stages don't show up here — same as if they'd been deleted,
  // from a player's point of view. (Their own saved team records for a
  // hidden stage still show on 我的隊伍總覽 if they have any, just
  // without a working link back to this stage — see myTeamsOverview.js.)
  const visibleStages = stages.filter((s) => !s.hidden);

  // group by chapter, preserving JSON order
  const chapters = [];
  const chapterIndex = new Map();
  for (const stage of visibleStages) {
    if (!chapterIndex.has(stage.chapter)) {
      chapterIndex.set(stage.chapter, { chapter: stage.chapter, stages: [] });
      chapters.push(chapterIndex.get(stage.chapter));
    }
    chapterIndex.get(stage.chapter).stages.push(stage);
  }

  const root = document.getElementById('stage-list-root');
  root.innerHTML = '';

  if (visibleStages.length === 0) {
    root.innerHTML = '<div class="empty-state"><h3>目前還沒有關卡資料</h3><p>請由站主於後台新增關卡。</p></div>';
    return;
  }

  for (const group of chapters) {
    const groupEl = document.createElement('div');
    groupEl.className = 'chapter-group';
    const title = document.createElement('div');
    title.className = 'chapter-title';
    title.textContent = group.chapter;
    groupEl.appendChild(title);

    const accordion = document.createElement('div');
    accordion.className = 'accordion';

    for (const stage of group.stages) {
      const item = document.createElement('div');
      item.className = 'accordion-item';

      const header = document.createElement('button');
      header.type = 'button';
      header.className = 'accordion-header';
      header.innerHTML = `
        <span class="accordion-order">${stage.order}</span>
        <span class="accordion-stage-title">${stage.title}</span>
        <span class="accordion-caret">▶</span>
      `;

      const panel = document.createElement('div');
      panel.className = 'accordion-panel';

      const recTags = (stage.recommendedTags || []).map((id) => tagMap.get(id)).filter(Boolean);
      const enemies = stage.enemies || [];

      panel.innerHTML = `
        <div class="accordion-block">
          <div class="accordion-block-label">推薦能力</div>
          <div class="tag-row">
            ${recTags.map((t) => `<span class="tag-pill"><img src="${resolveAsset(t.icon)}" alt="">${t.label}</span>`).join('') || '<span class="guide-preview">尚未設定</span>'}
          </div>
        </div>
        <div class="accordion-block">
          <div class="accordion-block-label">敵人</div>
          <div class="enemy-thumb-row"></div>
        </div>
      `;

      const enemyRow = panel.querySelector('.enemy-thumb-row');
      if (enemies.length) {
        for (const enemy of enemies) {
          const portrait = renderEnemyPortrait({
            imageSrc: enemy.image ? resolveAsset(enemy.image) : null,
            imageAlt: enemy.name,
            element: enemy.elementId ? elementMap.get(enemy.elementId) : null,
            imageZoom: enemy.imageZoom,
            imageOffsetX: enemy.imageOffsetX,
            imageOffsetY: enemy.imageOffsetY,
          });
          enemyRow.appendChild(portrait);
        }
      } else {
        enemyRow.innerHTML = '<span class="guide-preview">尚未提供敵人資訊。</span>';
      }

      const linkWrap = document.createElement('div');
      linkWrap.style.marginTop = '4px';
      const link = document.createElement('a');
      link.href = `stage-detail.html?id=${encodeURIComponent(stage.id)}`;
      link.className = 'btn btn-sm btn-secondary';
      link.textContent = '查看完整攻略 →';
      linkWrap.appendChild(link);
      panel.appendChild(linkWrap);

      header.addEventListener('click', () => {
        item.classList.toggle('open');
      });

      item.append(header, panel);
      accordion.appendChild(item);
    }

    groupEl.appendChild(accordion);
    root.appendChild(groupEl);
  }
}

init();
