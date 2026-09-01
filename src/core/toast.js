// src/core/toast.js
let stack = null;

function ensureStack() {
  if (stack) return stack;
  stack = document.createElement('div');
  stack.className = 'toast-stack';
  document.body.appendChild(stack);
  return stack;
}

export function showToast(message, { type = 'info', duration = 3200 } = {}) {
  const el = document.createElement('div');
  el.className = 'toast' + (type === 'error' ? ' toast-error' : '');
  el.textContent = message;
  ensureStack().appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.2s';
    setTimeout(() => el.remove(), 200);
  }, duration);
}
