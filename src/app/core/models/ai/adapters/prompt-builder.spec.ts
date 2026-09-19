import { describe, expect, it } from 'vitest';
import { extractJson } from './prompt-builder';
import { coerceGeneratedScript } from '../prompts/script-schema';

describe('extractJson', () => {
  it('parses fenced JSON from provider output', () => {
    const response = `Certainly — here is the script structure:
\n\`\`\`json
{
  "title": "Imported doc",
  "scenes": [
    {
      "title": "Hook",
      "role": "hook",
      "script": "Welcome to this lesson.",
      "estimatedDuration": 30
    }
  ]
}
\`\`\`
\nI hope this helps.`;

    expect(extractJson(response)).toEqual({
      title: 'Imported doc',
      scenes: [{
        title: 'Hook',
        role: 'hook',
        script: 'Welcome to this lesson.',
        estimatedDuration: 30,
      }],
    });
  });

  it('parses JSON wrapped in prose with unquoted keys', () => {
    const response = `Here is the adapted result: { title: "Imported doc", scenes: [ { title: "Hook", role: "hook", script: "Welcome to this lesson.", estimatedDuration: 30 } ] } Thanks!`;

    expect(extractJson(response)).toEqual({
      title: 'Imported doc',
      scenes: [{
        title: 'Hook',
        role: 'hook',
        script: 'Welcome to this lesson.',
        estimatedDuration: 30,
      }],
    });
  });

  it('coerces a provider wrapper around the generated script', () => {
    const response = extractJson<unknown>(JSON.stringify({
      data: JSON.stringify({
        title: 'Imported doc',
        scenes: [{ title: 'Hook', role: 'hook', script: 'Welcome.', estimatedDuration: 5 }],
      }),
    }));

    expect(coerceGeneratedScript(response, 150).scenes).toHaveLength(1);
  });

  it('recovers a JSON object truncated mid-string', () => {
    const response = `{"title":"T","scenes":[{"title":"Hook","role":"hook","script":"Welcome to this les`;

    expect(extractJson(response)).toEqual({
      title: 'T',
      scenes: [{ title: 'Hook', role: 'hook', script: 'Welcome to this les' }],
    });
  });

  it('recovers a JSON object truncated after a trailing comma', () => {
    const response = `{"title":"T","scenes":[{"title":"Hook","role":"hook","script":"Welcome",`;

    expect(extractJson(response)).toEqual({
      title: 'T',
      scenes: [{ title: 'Hook', role: 'hook', script: 'Welcome' }],
    });
  });

  it('throws a clear error when no JSON is present', () => {
    expect(() => extractJson('just some prose with no structure')).toThrow(/No JSON object or array/);
  });
});

describe('coerceGeneratedScript', () => {
  it('rejects an empty scenes array', () => {
    expect(() => coerceGeneratedScript({ scenes: [] }, 150)).toThrow(/no usable scenes/i);
  });

  it('drops unusable scene entries and keeps the rest', () => {
    const result = coerceGeneratedScript({
      scenes: [
        { title: '', script: '' },
        { title: 'Good scene', role: 'point', script: 'Hello there' },
      ],
    }, 150);

    expect(result.scenes).toHaveLength(1);
    expect(result.scenes[0].title).toBe('Good scene');
  });

  it('normalizes a human-readable duration', () => {
    const result = coerceGeneratedScript({
      scenes: [{ title: 'A', role: 'point', script: 'Hello world', estimatedDuration: '30 seconds' }],
    }, 150);

    expect(result.scenes[0].estimatedDuration).toBe(30);
  });

  it('normalizes aliased roles', () => {
    const result = coerceGeneratedScript({
      scenes: [
        { title: 'Open', role: 'opening', script: 'Hi' },
        { title: 'Close', role: 'call-to-action', script: 'Subscribe' },
      ],
    }, 150);

    expect(result.scenes[0].role).toBe('hook');
    expect(result.scenes[1].role).toBe('cta');
  });

  it('computes duration from word count when omitted', () => {
    const result = coerceGeneratedScript({
      scenes: [{ title: 'A', role: 'point', script: 'one two three four five' }],
    }, 150);

    // 5 words at 150 WPM ≈ 2s, clamped to the 5s floor.
    expect(result.scenes[0].estimatedDuration).toBe(5);
  });
});
