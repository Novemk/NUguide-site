// src/components/Modal.js

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
  document.body.style.overflow = 'hidden';

  function close() {
    overlay.remove();
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKeydown);
    if (onClose) onClose();
  }

  function onKeydown(e) {
    if (e.key === 'Escape') close();
  }

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', onKeydown);

  return { close, overlay, box };
}

export function confirmDialog(message) {
  return window.confirm(message);
}
