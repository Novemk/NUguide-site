// src/pages/stagesList.js
import { loadJSON, DataSources, toMap, resolveAsset } from '../core/dataLoader.js';
import { mountNavbar, mountFooter } from '../components/Navbar.js';

function stripHtml(html) {
  const div = document.createElement('div');
  div.innerHTML = html || '';
  return div.textContent || '';
}

async function init() {
  mountNavbar('stages.html');
  mountFooter();

  const [stages, stageTeams, tags, cards] = await Promise.all([
    loadJSON(DataSources.stages),
    loadJSON(DataSources.stageTeams),
    loadJSON(DataSources.tags),
    loadJSON(DataSources.cards),
  ]);
  const tagMap = toMap(tags);
  const cardMap = toMap(cards);
  const teamsByStage = new Map(stageTeams.map((entry) => [entry.stageId, entry.teams]));

  // group by chapter, preserving JSON order
  const chapters = [];
  const chapterIndex = new Map();
  for (const stage of stages) {
    if (!chapterIndex.has(stage.chapter)) {
      chapterIndex.set(stage.chapter, { chapter: stage.chapter, stages: [] });
      chapters.push(chapterIndex.get(stage.chapter));
    }
    chapterIndex.get(stage.chapter).stages.push(stage);
  }

  const root = document.getElementById('stage-list-root');
  root.innerHTML = '';

  if (stages.length === 0) {
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
      const officialTeams = teamsByStage.get(stage.id) || [];

      panel.innerHTML = `
        <div class="accordion-block">
          <div class="accordion-block-label">推薦能力</div>
          <div class="tag-row">
            ${recTags.map((t) => `<span class="tag-pill"><img src="${resolveAsset(t.icon)}" alt="">${t.label}</span>`).join('') || '<span class="guide-preview">尚未設定</span>'}
          </div>
        </div>
        <div class="accordion-block">
          <div class="accordion-block-label">攻略摘要</div>
          <div class="guide-preview">${stripHtml(stage.guide).slice(0, 60) || '（尚未撰寫攻略）'}${stripHtml(stage.guide).length > 60 ? '…' : ''}</div>
        </div>
        ${officialTeams.length ? `
        <div class="accordion-block">
          <div class="accordion-block-label">官方推薦隊伍</div>
          <div class="mini-team-row"></div>
        </div>` : ''}
      `;

      if (officialTeams.length) {
        const row = panel.querySelector('.mini-team-row');
        for (const team of officialTeams) {
          const chip = document.createElement('div');
          chip.style.cssText = 'display:flex;gap:6px;align-items:center;background:var(--bg-elevated);border:1px solid var(--border-soft);border-radius:8px;padding:6px 10px;';
          const avatars = team.members.filter(Boolean).slice(0, 5).map((cid) => {
            const c = cardMap.get(cid);
            return c ? `<img src="${resolveAsset(c.image)}" alt="" style="width:24px;height:24px;border-radius:5px;object-fit:cover;">` : '';
          }).join('');
          chip.innerHTML = `<span style="font-size:0.78rem;color:var(--text-dim);">${team.name}</span><span style="display:flex;gap:2px;">${avatars}</span>`;
          row.appendChild(chip);
        }
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
