'use strict';

/**
 * Strips script tags, iframe tags, javascript: URIs, and dangerous on* attributes.
 * Provides defense-in-depth on the server side for CMS content.
 */
function sanitizeHtml(dirty) {
  if (!dirty || typeof dirty !== 'string') return '';

  return dirty
    // Remove script tags and contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove iframe tags and contents
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    // Remove object, embed, and applet tags
    .replace(/<(object|embed|applet)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '')
    // Remove inline event handlers (e.g. onload=, onerror=, onclick=)
    .replace(/\s*on\w+\s*=\s*(['"][^'"]*['"]|[^\s>]+)/gi, '')
    // Remove javascript: and data: text/html in href/src
    .replace(/(href|src)\s*=\s*['"]\s*(javascript|data:text\/html):[^'"]*['"]/gi, '$1="#"');
}

module.exports = { sanitizeHtml };
