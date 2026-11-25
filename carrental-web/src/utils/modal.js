/**
 * Pure React/DOM modal state controller and accessibility focus-trap utilities.
 * Guarantees strictly one auth modal open at a time, zero stacked backdrops,
 * body scroll lock management, and safe focus restoration.
 */

const MODAL_ID_MAP = {
  login: 'login',
  '#loginform': 'login',
  loginform: 'login',
  signup: 'signup',
  '#signupform': 'signup',
  signupform: 'signup',
  forgot: 'forgot',
  '#forgotpassword': 'forgot',
  forgotpassword: 'forgot',
};

let currentModal = null;
let openerElement = null;
const listeners = new Set();

function notify() {
  listeners.forEach((listener) => listener(currentModal));
}

function normalizeModalName(target) {
  if (!target) return null;
  return MODAL_ID_MAP[String(target).toLowerCase()] || null;
}

function lockBodyScroll() {
  if (typeof document === 'undefined') return;
  document.body.classList.add('modal-open');
  document.body.style.overflow = 'hidden';
}

function unlockBodyScroll() {
  if (typeof document === 'undefined') return;
  document.body.classList.remove('modal-open');
  document.body.style.overflow = '';
}

function restoreOpenerFocus() {
  const opener = openerElement;
  openerElement = null;
  if (opener && opener.isConnected && typeof opener.focus === 'function') {
    requestAnimationFrame(() => {
      if (opener.isConnected) {
        opener.focus();
      }
    });
  }
}

export function getActiveModal() {
  return currentModal;
}

export function subscribeModal(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function openModal(target, triggerEl = null) {
  const name = normalizeModalName(target);
  if (!name) return;

  if (!currentModal && typeof document !== 'undefined') {
    const candidate =
      triggerEl instanceof HTMLElement
        ? triggerEl
        : document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
    if (candidate && candidate !== document.body) {
      openerElement = candidate;
    }
  }

  currentModal = name;
  lockBodyScroll();
  notify();
}

export function closeModal(target = null) {
  if (target) {
    const name = normalizeModalName(target);
    if (name && currentModal !== name) return;
  }
  if (!currentModal) return;

  currentModal = null;
  unlockBodyScroll();
  notify();
  restoreOpenerFocus();
}

export function showModal(selector) {
  openModal(selector);
}

export function hideModal(selector) {
  closeModal(selector);
}

export function getFocusableElements(container) {
  if (!container) return [];
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  return Array.from(container.querySelectorAll(selector)).filter((el) => {
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
}

// Minimal external test-hook bridge for legacy `window.$('#id').modal('show'|'hide')` callers
if (typeof window !== 'undefined' && !window.$) {
  window.$ = (selector) => ({
    modal: (action) => {
      if (action === 'show') openModal(selector);
      else if (action === 'hide') closeModal(selector);
    },
  });
}
