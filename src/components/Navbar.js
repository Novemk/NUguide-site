// src/components/Navbar.js
import { loadJSON, DataSources } from '../core/dataLoader.js';

const LINKS = [
  { href: 'index.html', label: '首頁' },
  { href: 'stages.html', label: '關卡攻略' },
  { href: 'cards.html', label: '卡片資料庫' },
  { href: 'my-teams.html', label: '我的隊伍' },
];

export function renderNavbar(current) {
  const nav = document.createElement('div');
  nav.className = 'navbar';
  const inner = document.createElement('div');
  inner.className = 'navbar-inner';

  const brand = document.createElement('a');
  brand.href = 'index.html';
  brand.className = 'navbar-brand';
  brand.style.textDecoration = 'none';

  // Kept as its own element (not a bare text node) so the async update
  // below can target it by id without touching the "玩家攻略站" subtitle
  // next to it.
  const titleSpan = document.createElement('span');
  titleSpan.id = 'navbar-brand-title';
  titleSpan.textContent = '流光秘境攻略';
  const subtitleSpan = document.createElement('span');
  subtitleSpan.className = 'navbar-brand-sub';
  subtitleSpan.textContent = '玩家攻略站';
  brand.append(titleSpan, subtitleSpan);

  const links = document.createElement('div');
  links.className = 'navbar-links';
  for (const link of LINKS) {
    const a = document.createElement('a');
    a.href = link.href;
    a.textContent = link.label;
    if (link.href === current) a.classList.add('active');
    links.appendChild(a);
  }

  inner.append(brand, links);
  nav.appendChild(inner);
  return nav;
}

export function mountNavbar(current) {
  const host = document.getElementById('navbar-host');
  if (!host) return;
  host.replaceWith(renderNavbar(current));

  // Same siteTitle field the homepage's <h1> uses (edited from the
  // admin's 網站設定 page) — applied here too so the navbar brand and
  // the homepage heading always show the same text. Fetched after the
  // navbar is already on screen so a slow/missing settings file never
  // blocks or breaks the page; the hardcoded text above is the fallback.
  loadJSON(DataSources.siteSettings).then((settings) => {
    if (!settings || !settings.siteTitle) return;
    const titleEl = document.getElementById('navbar-brand-title');
    if (titleEl) titleEl.textContent = settings.siteTitle;
  }).catch(() => {});
}

export function mountFooter() {
  const host = document.getElementById('footer-host');
  if (!host) return;
  const footer = document.createElement('div');
  footer.className = 'site-footer';
  footer.innerHTML = '<div class="container">攻略內容由站主維護 · 隊伍紀錄僅儲存於你的瀏覽器</div>';
  host.replaceWith(footer);
}
