// src/components/CardFace.js
import { resolveAsset } from '../core/dataLoader.js';

/**
 * Mounts a "cover"-cropped image (same math as the admin's interactive
 * cropper) into a clip element, self-positioning on load/resize. Shared
 * by renderCardFace() and renderCardCrop() so the pixel math — and any
 * future fix to it — lives in exactly one place.
 *
 * @param {HTMLElement} clip - the overflow:hidden container the image is cropped against
 * @param {string} imageSrc
 * @param {string} imageAlt
 * @param {number} imageZoom
 * @param {number} imageOffsetX
 * @param {number} imageOffsetY
 * @returns {HTMLImageElement}
 */
function mountCoverImage(clip, { imageSrc, imageAlt = '', imageZoom = 1, imageOffsetX = 0.5, imageOffsetY = 0.5 }) {
  const img = document.createElement('img');
  img.className = 'card-face-img';
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
  if (img.complete && img.naturalWidth) layout(); // cached image, load already fired

  const resizeObserver = new ResizeObserver(() => layout());
  resizeObserver.observe(clip);

  return img;
}

const BORDER_CLASS_BY_RARITY = { ssr: 'card-face-border-ssr', sr: 'card-face-border-sr', r: 'card-face-border-r', n: 'card-face-border-n' };

/**
 * Renders the visual "face" of a card:
 * - full-bleed artwork (with optional zoom/pan positioning), clipped to
 *   rounded corners by an inner .card-face-clip wrapper
 * - a metallic gradient border keyed to the rarity
 * - element badge, top-left — deliberately NOT inside the clipped wrapper,
 *   and appended after the border, so it can overflow past the card's
 *   edge and paint above the border/gradient/artwork
 * - class (定位) badge, top-right
 * - a bottom semi-transparent black gradient with the rarity label
 *
 * @param {Object} opts
 * @param {string} opts.imageSrc - resolved image URL (already run through resolveAsset)
 * @param {string} [opts.imageAlt]
 * @param {{label:string, color:string, id:string}|null} [opts.rarity]
 * @param {{label:string, icon:string}|null} [opts.element]
 * @param {{label:string, icon:string}|null} [opts.cls]
 * @param {number} [opts.imageZoom] - 1 = fit, >1 = zoomed in. Defaults to 1.
 * @param {number} [opts.imageOffsetX] - 0-1, horizontal pan fraction. Defaults to 0.5 (center).
 * @param {number} [opts.imageOffsetY] - 0-1, vertical pan fraction. Defaults to 0.5 (center).
 */
export function renderCardFace({
  imageSrc,
  imageAlt = '',
  rarity = null,
  element = null,
  cls = null,
  imageZoom = 1,
  imageOffsetX = 0.5,
  imageOffsetY = 0.5,
}) {
  const face = document.createElement('div');
  face.className = 'card-face';

  const clip = document.createElement('div');
  clip.className = 'card-face-clip';
  face.appendChild(clip);

  mountCoverImage(clip, { imageSrc, imageAlt, imageZoom, imageOffsetX, imageOffsetY });

  const gradient = document.createElement('div');
  gradient.className = 'card-face-gradient';
  clip.appendChild(gradient);

  if (rarity) {
    const rarityLabel = document.createElement('span');
    rarityLabel.className = 'card-face-rarity';

    const letterPalettes = {
      ssr: ['#7CF5D8', '#FFF04D', '#FFC4FF'],
      sr: ['#fffbe0', '#ffff9c'],
    };
    const glowColors = { sr: '#ff7300', ssr: '#ffd700' };

    if (letterPalettes[rarity.id]) {
      const palette = letterPalettes[rarity.id];
      const glow = glowColors[rarity.id];
      [...rarity.label].forEach((ch, i) => {
        const span = document.createElement('span');
        span.textContent = ch;
        span.style.color = palette[i % palette.length];
        if (glow) {
          span.style.textShadow = `0 0 6px ${glow}, 0 1px 4px rgba(0,0,0,0.9)`;
        }
        rarityLabel.appendChild(span);
      });
    } else if (rarity.id === 'n') {
      rarityLabel.textContent = rarity.label;
      rarityLabel.style.color = '#E2EBF0';
    } else if (rarity.id === 'r') {
      rarityLabel.textContent = rarity.label;
      rarityLabel.style.color = '#c9a8f0';
    } else {
      rarityLabel.textContent = rarity.label;
      if (rarity.color) rarityLabel.style.color = rarity.color;
    }

    clip.appendChild(rarityLabel);

    const borderClass = BORDER_CLASS_BY_RARITY[rarity.id];
    if (borderClass) {
      const border = document.createElement('div');
      border.className = `card-face-border ${borderClass}`;
      face.appendChild(border);
    }
  }

  // Badges are appended last (and live outside .card-face-clip) so they
  // paint above the border/gradient/artwork and — for the element badge —
  // are free to overflow past the card's own rounded-corner edge.
  if (cls) {
    const badge = document.createElement('span');
    badge.className = 'card-face-badge card-face-badge-tr';
    badge.title = cls.label;
    const bimg = document.createElement('img');
    bimg.src = resolveAsset(cls.icon);
    bimg.alt = cls.label;
    badge.appendChild(bimg);
    face.appendChild(badge);
  }

  if (element) {
    const badge = document.createElement('span');
    badge.className = 'card-face-badge card-face-badge-tl';
    badge.title = element.label;
    const bimg = document.createElement('img');
    bimg.src = resolveAsset(element.icon);
    bimg.alt = element.label;
    badge.appendChild(bimg);
    face.appendChild(badge);
  }

  return face;
}

/**
 * A pared-down sibling of renderCardFace(): just the cropped artwork and
 * the rarity-keyed metallic border, no badges/gradient/rarity-text
 * overlay. Used where the card's attribute/class/CD/etc. are already
 * being shown separately as plain text/icons nearby (e.g. the 卡片資訊
 * modal), so the thumbnail itself should just read as "the picture,
 * cropped the same way as everywhere else" without duplicating info.
 *
 * @param {Object} opts
 * @param {string} opts.imageSrc
 * @param {string} [opts.imageAlt]
 * @param {{label:string, color:string, id:string}|null} [opts.rarity]
 * @param {number} [opts.imageZoom]
 * @param {number} [opts.imageOffsetX]
 * @param {number} [opts.imageOffsetY]
 */
export function renderCardCrop({
  imageSrc,
  imageAlt = '',
  rarity = null,
  imageZoom = 1,
  imageOffsetX = 0.5,
  imageOffsetY = 0.5,
}) {
  const face = document.createElement('div');
  face.className = 'card-face';

  const clip = document.createElement('div');
  clip.className = 'card-face-clip';
  face.appendChild(clip);

  mountCoverImage(clip, { imageSrc, imageAlt, imageZoom, imageOffsetX, imageOffsetY });

  const borderClass = rarity && BORDER_CLASS_BY_RARITY[rarity.id];
  if (borderClass) {
    const border = document.createElement('div');
    border.className = `card-face-border ${borderClass}`;
    face.appendChild(border);
  }

  return face;
}
