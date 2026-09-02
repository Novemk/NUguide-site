// src/components/CardFace.js
import { resolveAsset } from '../core/dataLoader.js';

/**
 * Renders the visual "face" of a card:
 * - full-bleed artwork
 * - element badge, top-left
 * - class (定位) badge, top-right
 * - a bottom semi-transparent black gradient with the rarity label
 *
 * This is a shared building block — the player-facing card grid wraps it in
 * a <button>, and the admin's upload dropzone renders it standalone (no
 * click behavior) purely so the operator can see whether the badges cover
 * the character's face before publishing.
 *
 * @param {Object} opts
 * @param {string} opts.imageSrc - resolved image URL (already run through resolveAsset)
 * @param {string} [opts.imageAlt]
 * @param {{label:string, color:string}|null} [opts.rarity]
 * @param {{label:string, icon:string}|null} [opts.element]
 * @param {{label:string, icon:string}|null} [opts.cls]
 */
export function renderCardFace({ imageSrc, imageAlt = '', rarity = null, element = null, cls = null }) {
  const face = document.createElement('div');
  face.className = 'card-face';

  const img = document.createElement('img');
  img.className = 'card-face-img';
  img.src = imageSrc;
  img.alt = imageAlt;
  img.loading = 'lazy';
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
    // - n: single letter, a short background-clip gradient across it
    //   still shows both tones blending, so it's left as one gradient.
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
    } else {
      rarityLabel.textContent = rarity.label;
      if (rarity.color) rarityLabel.style.color = rarity.color;
    }

    face.appendChild(rarityLabel);
  }

  return face;
}
