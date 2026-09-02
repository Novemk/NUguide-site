// src/components/Modal.js

// Modals can now stack (e.g. the 卡片資訊 modal opening on top of the
// 選擇卡片 picker). Two things a naive "one modal at a time" implementation
// gets wrong once that happens:
//  1. Scroll lock: closing the top modal shouldn't unlock scrolling while
//     one underneath is still open — openModalStack.length tracks this.
//  2. Esc key: should close only the TOPMOST modal, not every open one.
//     A single shared keydown listener (rather than one per modal) with a
//     stack of close functions gets this right regardless of stacking order.
const openModalStack = [];

function onGlobalKeydown(e) {
  if (e.key !== 'Escape') return;
  const top = openModalStack[openModalStack.length - 1];
  if (top) top.close();
}

/**
 * Opens a modal dialog.
 * @param {Object} opts
 * @param {string} opts.title
 * @param {HTMLElement} opts.body - element to place in the modal body
 * @param {boolean} [opts.wide]
 * @param {() => void} [opts.onClose]
 * @returns {{ close: () => void, overlay: HTMLElement }}
 */
export function openModal({ title, body, wide = false, onClose }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const box = document.createElement('div');
  box.className = 'modal-box' + (wide ? ' modal-wide' : '');
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');

  const header = document.createElement('div');
  header.className = 'modal-header';
  const h2 = document.createElement('h2');
  h2.textContent = title;
  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close';
  closeBtn.setAttribute('aria-label', '關閉');
  closeBtn.innerHTML = '&times;';
  header.append(h2, closeBtn);

  const bodyWrap = document.createElement('div');
  bodyWrap.className = 'modal-body';
  bodyWrap.appendChild(body);

  box.append(header, bodyWrap);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  if (openModalStack.length === 0) document.addEventListener('keydown', onGlobalKeydown);
  document.body.style.overflow = 'hidden';

  const entry = { close };
  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    overlay.remove();
    const idx = openModalStack.indexOf(entry);
    if (idx !== -1) openModalStack.splice(idx, 1);
    if (openModalStack.length === 0) {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onGlobalKeydown);
    }
    if (onClose) onClose();
  }
  entry.close = close;
  openModalStack.push(entry);

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  return { close, overlay, box };
}

export function confirmDialog(message) {
  return window.confirm(message);
}
