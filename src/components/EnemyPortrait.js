// src/components/EnemyPortrait.js
import { resolveAsset } from '../core/dataLoader.js';

/**
 * Renders one enemy's square portrait: a rounded-corner square image with
 * an element badge overlaid top-left, or — if no image has been uploaded
 * yet — an empty placeholder of the exact same size and shape, so the row
 * stays visually consistent whether or not every enemy has art.
 *
 * Uses the same self-positioning pixel math as CardFace.js (measured via
 * ResizeObserver + the image's real naturalWidth/Height once loaded), so
 * the zoom/pan values set in the admin's cropper render identically here.
 *
 * @param {Object} opts
 * @param {string} [opts.imageSrc] - resolved image URL; omit for the empty placeholder
 * @param {string} [opts.imageAlt]
 * @param {{label:string, icon:string}|null} [opts.element]
 * @param {number} [opts.imageZoom]
 * @param {number} [opts.imageOffsetX] - 0-1
 * @param {number} [opts.imageOffsetY] - 0-1
 */
export function renderEnemyPortrait({
  imageSrc,
  imageAlt = '',
  element = null,
  imageZoom = 1,
  imageOffsetX = 0.5,
  imageOffsetY = 0.5,
}) {
  if (!imageSrc) {
    const empty = document.createElement('div');
    empty.className = 'enemy-portrait enemy-portrait-empty';
    empty.innerHTML = `
      <svg viewBox="0 0 48 48" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2.2">
        <rect x="5" y="9" width="38" height="30" rx="4"/>
        <circle cx="17" cy="19" r="3.5"/>
        <path d="M5 32 L17 22 L26 29 L34 21 L43 30" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    return empty;
  }

  const portrait = document.createElement('div');
  portrait.className = 'enemy-portrait';

  const clip = document.createElement('div');
  clip.className = 'enemy-portrait-clip';
  portrait.appendChild(clip);

  const img = document.createElement('img');
  img.className = 'enemy-portrait-img';
  img.alt = imageAlt;
  img.loading = 'lazy';
  img.draggable = false;
  clip.appendChild(img);

  function layout() {
    if (!img.naturalWidth || !img.naturalHeight) return;
    const vw = clip.clientWidth;
    const vh = clip.clientHeight;
    if (vw === 0 || vh === 0) return;
    const coverScale = Math.max(vw / img.naturalWidth, vh / img.naturalHeight);
    const scale = coverScale * (imageZoom || 1);
    const renderW = img.naturalWidth * scale;
    const renderH = img.naturalHeight * scale;
    const overflowX = Math.max(0, renderW - vw);
    const overflowY = Math.max(0, renderH - vh);
    img.style.width = `${renderW}px`;
    img.style.height = `${renderH}px`;
    img.style.left = `${-overflowX * imageOffsetX}px`;
    img.style.top = `${-overflowY * imageOffsetY}px`;
  }
  img.addEventListener('load', layout);
  img.src = imageSrc;
  if (img.complete && img.naturalWidth) layout();

  const resizeObserver = new ResizeObserver(() => layout());
  resizeObserver.observe(clip);

  if (element) {
    // Deliberately a sibling of .enemy-portrait-clip, not a child of it —
    // the clip div is where overflow:hidden lives (so the photo itself
    // stays a clean rounded square), while the badge sits in the outer
    // .enemy-portrait wrapper, which has no clipping, so it's free to
    // overflow past the square's top-left corner as intended.
    const badge = document.createElement('span');
    badge.className = 'enemy-portrait-badge';
    badge.title = element.label;
    const bimg = document.createElement('img');
    bimg.src = resolveAsset(element.icon);
    bimg.alt = element.label;
    badge.appendChild(bimg);
    portrait.appendChild(badge);
  }

  return portrait;
}

/**
 * Renders a full enemy "chip": the square portrait plus name/note text,
 * used on the public stage detail page.
 * @param {Object} enemy - { name, note, elementId, image, imageZoom, imageOffsetX, imageOffsetY }
 * @param {Map} elementMap
 */
export function renderEnemyChip(enemy, elementMap) {
  const chip = document.createElement('div');
  chip.className = 'enemy-chip';

  const portrait = renderEnemyPortrait({
    imageSrc: enemy.image ? resolveAsset(enemy.image) : null,
    imageAlt: enemy.name,
    element: enemy.elementId ? elementMap.get(enemy.elementId) : null,
    imageZoom: enemy.imageZoom,
    imageOffsetX: enemy.imageOffsetX,
    imageOffsetY: enemy.imageOffsetY,
  });
  chip.appendChild(portrait);

  const textWrap = document.createElement('div');
  textWrap.className = 'enemy-chip-text';
  const name = document.createElement('div');
  name.className = 'enemy-chip-name';
  name.textContent = enemy.name;
  textWrap.appendChild(name);
  if (enemy.note) {
    const note = document.createElement('div');
    note.className = 'enemy-chip-note';
    note.textContent = enemy.note;
    textWrap.appendChild(note);
  }
  chip.appendChild(textWrap);

  return chip;
}
