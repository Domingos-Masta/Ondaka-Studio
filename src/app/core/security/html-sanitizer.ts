// src/app/core/security/html-sanitizer.ts
import DOMPurify from 'dompurify';

/**
 * Markup the script editor is able to produce (see
 * `src/app/features/script-editor/extensions`). Anything else is dropped:
 * `.swproj` files, imported documents and model output are untrusted input.
 */
const ALLOWED_TAGS = [
  'p', 'br', 'div', 'span',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'u', 's', 'del', 'strike', 'mark', 'sub', 'sup', 'small',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code', 'hr',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'colgroup', 'col', 'caption',
  'img', 'a', 'details', 'summary', 'figure', 'figcaption',
];

/** Inline formatting (colour, highlight, alignment, fonts) is stored as inline CSS. */
const ALLOWED_ATTR = [
  'href', 'title', 'rel', 'target', 'src', 'alt', 'width', 'height',
  'colspan', 'rowspan', 'colwidth', 'style', 'class', 'open', 'start', 'type', 'align',
];

const FORBIDDEN_TAGS = [
  'script', 'style', 'iframe', 'frame', 'frameset', 'object', 'embed', 'applet',
  'form', 'input', 'button', 'select', 'textarea', 'link', 'meta', 'base',
  'svg', 'math', 'template', 'noscript',
];

/**
 * Sanitizes editor HTML with an explicit allow-list so event handlers, scripts
 * and unknown elements coming from files or AI output can never reach the DOM.
 * Falls back to escaping when DOMPurify has no DOM to work with.
 */
export function sanitizeEditorHtml(html: string): string {
  if (!html) return '';
  if (typeof window === 'undefined' || !DOMPurify.isSupported) return escapeHtml(html);
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_TAGS: FORBIDDEN_TAGS,
    ALLOW_DATA_ATTR: true,
  });
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
