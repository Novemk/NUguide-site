// src/components/CardFace.js
import { resolveAsset } from '../core/dataLoader.js';

/**
 * Renders the visual "face" of a card:
 * - full-bleed artwork (with optional zoom/pan positioning)
 * - element badge, top-left
 * - class (定位) badge, top-right
 * - a bottom semi-transparent black gradient with the rarity label
 * - a metallic gradient border keyed to the rarity
 *
 * Image positioning uses the exact same pixel-based math as the admin's
 * interactive cropper (src/components/ImageCropper.js) — real
 * getBoundingClientRect() + naturalWidth/naturalHeight measurements taken
 * after the image is actually in the live DOM, never CSS percentages
 * against a container whose height comes from `aspect-ratio` (that
 * combination is what caused the black-edge bug previously). Because the
 * math lives in one place, what the operator sees while editing a card is
 * guaranteed to match what players see on the actual site.
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

  const img = document.createElement('img');
  img.className = 'card-face-img';
  img.alt = imageAlt;
  img.loading = 'lazy';
  img.draggable = false;
  face.appendChild(img);

  // Self-positioning: recompute pixel geometry whenever the image finishes
  // loading (need naturalWidth/Height) and whenever the card's own
  // rendered size changes (ResizeObserver — covers responsive grid
  // reflow, window resize, etc). This makes CardFace fully self-contained;
  // callers never need to measure or re-position it themselves.
  function layout() {
    if (!img.naturalWidth || !img.naturalHeight) return;
    const vw = face.clientWidth;
    const vh = face.clientHeight;
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
  resizeObserver.observe(face);

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

  const gradient = document.createElement('div');
  gradient.className = 'card-face-gradient';
  face.appendChild(gradient);

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

    face.appendChild(rarityLabel);

    const borderIds = { ssr: 'card-face-border-ssr', sr: 'card-face-border-sr', r: 'card-face-border-r', n: 'card-face-border-n' };
    const borderClass = borderIds[rarity.id];
    if (borderClass) {
      const border = document.createElement('div');
      border.className = `card-face-border ${borderClass}`;
      face.appendChild(border);
    }
  }

  return face;
}
