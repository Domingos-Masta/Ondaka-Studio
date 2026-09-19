export function renderTemplate(template: string, vars: Record<string, string | number | undefined>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const v = vars[key];
    return v === undefined || v === null ? '' : String(v);
  });
}

const FENCE_PATTERN = /```(?:json|javascript|js)?\s*([\s\S]*?)```/gi;

/**
 * Extract the first valid JSON value from a noisy LLM response.
 *
 * Handles fenced code blocks, leading prose, trailing commentary, arrays, and
 * truncated output (where the model ran out of tokens mid-string or mid-object).
 */
export function extractJson<T>(input: string): T {
  const cleaned = (input ?? '').replace(/^\uFEFF/, '').trim();
  if (!cleaned) {
    throw new Error('AI response was empty.');
  }

  // Collect the raw string plus every fenced block the model may have emitted.
  const candidates = new Set<string>();
  const addCandidate = (value: string) => {
    const next = value.trim();
    if (next) candidates.add(next);
  };

  addCandidate(cleaned);

  let fenceMatch: RegExpExecArray | null;
  FENCE_PATTERN.lastIndex = 0;
  while ((fenceMatch = FENCE_PATTERN.exec(cleaned)) !== null) {
    addCandidate(fenceMatch[1]);
  }

  for (const candidate of candidates) {
    // Fast path: the whole payload is already valid JSON.
    try {
      return JSON.parse(candidate) as T;
    } catch { /* fall through to block scanning */ }

    // Try every balanced {...} / [...] region, repaired and auto-closed.
    for (const block of extractBalancedBlocks(candidate)) {
      for (const attempt of buildAttempts(block)) {
        try {
          return JSON.parse(attempt) as T;
        } catch { /* try the next variant */ }
      }
    }

    // Last resort: repair/close the whole candidate (e.g. a single object with
    // a small typo and no nested braces).
    for (const attempt of buildAttempts(candidate)) {
      try {
        return JSON.parse(attempt) as T;
      } catch { /* try the next variant */ }
    }
  }

  throw new Error(`No JSON object or array found in AI response: ${cleaned.slice(0, 160)}`);
}

/**
 * Return every balanced `{...}` / `[...]` region in `value`, largest first, so
 * the most complete payload is tried before partial inner fragments.
 */
function extractBalancedBlocks(value: string): string[] {
  const blocks: string[] = [];

  for (let start = 0; start < value.length; start++) {
    const ch = value[start];
    if (ch !== '{' && ch !== '[') continue;

    const stack: string[] = [];
    let inString = false;
    let escaped = false;

    for (let i = start; i < value.length; i++) {
      const c = value[i];
      if (inString) {
        if (escaped) { escaped = false; continue; }
        if (c === '\\') { escaped = true; continue; }
        if (c === '"') inString = false;
        continue;
      }
      if (c === '"') { inString = true; continue; }
      if (c === '{' || c === '[') {
        stack.push(c === '{' ? '}' : ']');
        continue;
      }
      if (c !== '}' && c !== ']') continue;

      if (stack.length === 0 || stack[stack.length - 1] !== c) {
        stack.length = 0;
        break;
      }
      stack.pop();

      if (stack.length === 0) {
        blocks.push(value.slice(start, i + 1));
        break;
      }
    }
  }

  blocks.sort((a, b) => b.length - a.length);
  return blocks;
}

/**
 * Build a de-duplicated list of parse attempts for a snippet: the snippet
 * itself, a repaired variant, and auto-closed variants for truncated output.
 */
function buildAttempts(snippet: string): string[] {
  const attempts = new Set<string>();
  attempts.add(snippet);
  attempts.add(repairJson(snippet));
  attempts.add(repairJson(closeTruncatedJson(snippet)));
  attempts.add(closeTruncatedJson(repairJson(snippet)));
  return [...attempts];
}

/**
 * Heuristically close a JSON fragment that was cut off before its closing
 * brackets could be emitted.
 *
 *   `{"scenes":[{"title":"H`   → closes string, then `}]}`
 *   `{"scenes":[{"title":"H",` → closes object, then `]}`
 */
function closeTruncatedJson(value: string): string {
  let text = value;
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{') { stack.push('}'); continue; }
    if (ch === '[') { stack.push(']'); continue; }
    if (ch === '}' || ch === ']') {
      if (stack.length > 0) stack.pop();
    }
  }

  if (inString) text += '"';
  text = text.replace(/[,\s]+$/, '');
  while (stack.length > 0) {
    text += stack.pop();
  }
  return text;
}

/**
 * Repair the most common non-standard-JSON mistakes produced by LLMs.
 */
function repairJson(value: string): string {
  return value
    .replace(/([{,]\s*)([A-Za-z_$][A-Za-z0-9_$]*)\s*:/g, '$1"$2":')
    .replace(/:\s*'([^'\\]*(?:\\.[^'\\]*)*)'/g, ': "$1"')
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/\bundefined\b/gi, 'null')
    .replace(/\bNaN\b/gi, 'null')
    .replace(/\bInfinity\b/gi, 'null')
    .replace(/:\s*,\s*([}\]])/g, ': null$1');
}