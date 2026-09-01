// src/components/Navbar.js

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
  brand.textContent = '流光秘境攻略';
  brand.innerHTML += '<span>玩家攻略站</span>';
  brand.style.textDecoration = 'none';

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
  if (host) host.replaceWith(renderNavbar(current));
}

export function mountFooter() {
  const host = document.getElementById('footer-host');
  if (!host) return;
  const footer = document.createElement('div');
  footer.className = 'site-footer';
  footer.innerHTML = '<div class="container">攻略內容由站主維護 · 隊伍紀錄僅儲存於你的瀏覽器</div>';
  host.replaceWith(footer);
}
