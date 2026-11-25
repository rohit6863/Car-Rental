/**
 * Helper to reliably show/hide Bootstrap 3 modals from React without
 * getting stuck on CSS transitionend events or leftover backdrops.
 */
export function hideModal(selector) {
  if (typeof window === 'undefined') return;

  if (window.$) {
    try {
      window.$(selector).modal('hide');
    } catch {
      // ignore jQuery/Bootstrap errors
    }
    window.$(selector).removeClass('in show').hide().attr('aria-hidden', 'true');
    window.$('.modal-backdrop').remove();
  } else {
    const el = document.querySelector(selector);
    if (el) {
      el.classList.remove('in', 'show');
      el.style.display = 'none';
      el.setAttribute('aria-hidden', 'true');
    }
    document.querySelectorAll('.modal-backdrop').forEach((b) => b.remove());
  }

  document.body.classList.remove('modal-open');
  document.body.style.paddingRight = '';
}

export function showModal(selector) {
  if (typeof window === 'undefined') return;
  if (window.$) {
    try {
      window.$(selector).modal('show');
    } catch {
      // ignore
    }
  }
}
