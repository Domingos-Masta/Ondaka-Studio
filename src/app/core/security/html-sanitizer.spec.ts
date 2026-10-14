import { describe, expect, it } from 'vitest';
import { escapeHtml, sanitizeEditorHtml } from './html-sanitizer';
import { toEditorHtml } from '../models/project.model';

describe('sanitizeEditorHtml', () => {
  it('strips event handlers that would execute on render', () => {
    const dirty = '<p>hello</p><img src="x" onerror="alert(1)">';
    const clean = sanitizeEditorHtml(dirty);

    expect(clean).not.toContain('onerror');
    expect(clean).not.toContain('alert(1)');
    expect(clean).toContain('hello');
  });

  it('removes scripts, inline styles, iframes and forms', () => {
    const clean = sanitizeEditorHtml(
      '<script>alert(1)</script><style>body{}</style><iframe src="https://evil.test"></iframe>'
      + '<form action="https://evil.test"><input name="a"></form>',
    );

    expect(clean).toBe('');
  });

  it('keeps the markup the script editor produces', () => {
    const clean = sanitizeEditorHtml(
      '<h2>Title</h2><p style="color: #ff0000; text-align: center">Body</p>'
      + '<table><tbody><tr><th colspan="2">H</th></tr></tbody></table>'
      + '<details open><summary>S</summary>hidden</details>'
      + '<a href="https://example.com" rel="noopener">link</a>',
    );

    expect(clean).toContain('<h2>Title</h2>');
    expect(clean).toContain('color: #ff0000');
    expect(clean).toContain('<table>');
    expect(clean).toContain('colspan="2"');
    expect(clean).toMatch(/<details[^>]*open/);
    expect(clean).toContain('href="https://example.com"');
  });

  it('drops javascript: URLs', () => {
    const clean = sanitizeEditorHtml('<a href="javascript:alert(1)">x</a>');
    expect(clean).not.toContain('javascript:');
  });
});

describe('toEditorHtml', () => {
  it('escapes plain text into paragraphs', () => {
    expect(toEditorHtml('a < b & c')).toBe('<p>a &lt; b &amp; c</p>');
    expect(toEditorHtml('one\n\ntwo')).toBe('<p>one</p><p>two</p>');
  });

  it('sanitizes values that already look like editor markup', () => {
    const converted = toEditorHtml('<p>ok</p><img src=x onerror="alert(1)">');

    expect(converted).toContain('<p>ok</p>');
    expect(converted).not.toContain('onerror');
  });
});

describe('escapeHtml', () => {
  it('escapes the characters that open a tag', () => {
    expect(escapeHtml('<img src=x onerror=1> & more')).toBe('&lt;img src=x onerror=1&gt; &amp; more');
  });
});
