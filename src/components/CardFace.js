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
 * This is a shared building block — the player-facing card grid wraps it in
 * a <button>, and the admin's upload dropzone renders it standalone (no
 * click behavior) purely so the operator can see whether the badges cover
 * the character's face before publishing.
 *
 * @param {Object} opts
 * @param {string} opts.imageSrc - resolved image URL (already run through resolveAsset)
 * @param {string} [opts.imageAlt]
 * @param {{label:string, color:string, id:string}|null} [opts.rarity]
 * @param {{label:string, icon:string}|null} [opts.element]
 * @param {{label:string, icon:string}|null} [opts.cls]
 * @param {number} [opts.imageZoom] - 1 = fit, >1 = zoomed in. Defaults to 1.
 * @param {number} [opts.imageOffsetX] - 0-100, horizontal focus point. Defaults to 50 (center).
 * @param {number} [opts.imageOffsetY] - 0-100, vertical focus point. Defaults to 50 (center).
 */
export function renderCardFace({
  imageSrc,
  imageAlt = '',
  rarity = null,
  element = null,
  cls = null,
  imageZoom = 1,
  imageOffsetX = 50,
  imageOffsetY = 50,
}) {
  const face = document.createElement('div');
  face.className = 'card-face';

  const img = document.createElement('img');
  img.className = 'card-face-img';
  img.src = imageSrc;
  img.alt = imageAlt;
  img.loading = 'lazy';
  img.style.objectPosition = `${imageOffsetX}% ${imageOffsetY}%`;
  if (imageZoom && imageZoom !== 1) {
    img.style.transform = `scale(${imageZoom})`;
  }
  face.appendChild(img);

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

    // Per-rarity treatments:
    // - ssr / sr: each letter gets its own solid color from a fixed
    //   palette (a continuous gradient doesn't read on 2-3 characters).
    // - n: flat light gray-white.
    // - anything else (r, or a future custom rarity): flat color from
    //   rarities.json, unchanged.
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

    // Metallic gradient border, keyed to the rarity id. Falls back to no
    // special border for a custom rarity id we don't have a palette for.
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
