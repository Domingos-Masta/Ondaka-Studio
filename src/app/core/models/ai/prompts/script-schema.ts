import { SceneRole } from "../../project.model";


export interface GeneratedScene {
  title: string;
  role: SceneRole;
  script: string;
  estimatedDuration: number;
  notes?: string;
}

export interface GeneratedScript {
  title?: string;
  scenes: GeneratedScene[];
}

export const VALID_ROLES: SceneRole[] = ['hook','intro','setup','point','demo','transition','cta','outro'];

export const SCRIPT_JSON_INSTRUCTIONS = `
Return valid JSON only (no prose, no code fences) with this exact shape:
{
  "title": "string",
  "scenes": [
    {
      "title": "string",
      "role": "hook" | "intro" | "setup" | "point" | "demo" | "transition" | "cta" | "outro",
      "script": "string — full spoken script for this scene",
      "estimatedDuration": number,
      "notes": "string (optional)"
    }
  ]
}
Rules:
- The "scenes" array must contain at least 2 scenes. Never return an empty scenes array.
- First scene must be role "hook".
- Last scene must be role "cta" or "outro".
- Write for spoken delivery. Assume {{wpm}} WPM.
- Keep each scene focused on a single idea.
`;

/**
 * Normalize an unknown AI payload into a validated {@link GeneratedScript}.
 *
 * Deliberately forgiving: unwraps common provider wrappers, coerces loose field
 * types, drops unusable scene entries, and computes a duration from word count
 * when the model omitted `estimatedDuration`. Only throws when the payload
 * cannot be salvaged into at least one usable scene.
 */
export function coerceGeneratedScript(raw: unknown, defaultWpm: number): GeneratedScript {
  const wpm = Number.isFinite(defaultWpm) && defaultWpm > 0 ? defaultWpm : 150;
  const normalized = unwrapGeneratedScript(raw);
  const object = isRecord(normalized) ? normalized : undefined;

  const scenesInput = extractScenes(normalized, object);
  if (!Array.isArray(scenesInput)) {
    throw new Error('AI response missing "scenes" array. Expected an object like { "scenes": [...] } or an array of scenes.');
  }

  const scenes: GeneratedScene[] = [];
  const warnings: string[] = [];

  scenesInput.forEach((item, index) => {
    const scene = coerceScene(item, index, wpm);
    if (!scene) {
      warnings.push(`Scene #${index + 1} was skipped because it had no usable content.`);
      return;
    }
    scenes.push(scene);
  });

  const roles = scenes.map(s => s.role);
  if (roles.length > 0 && roles[0] !== 'hook') {
    warnings.push('The first scene is not a "hook".');
  }
  if (roles.length > 1 && roles[roles.length - 1] !== 'cta' && roles[roles.length - 1] !== 'outro') {
    warnings.push('The last scene is not a "cta" or "outro".');
  }

  if (scenes.length === 0) {
    throw new Error(
      `AI returned no usable scenes${warnings.length ? ` (${warnings.join(' ')})` : ''}. ` +
      'Try regenerating with a more detailed prompt.'
    );
  }

  return {
    title: typeof object?.title === 'string' && object.title.trim() ? object.title.trim() : undefined,
    scenes,
  };
}

/** Locate the scenes array across the shapes providers commonly return. */
function extractScenes(normalized: unknown, object: Record<string, unknown> | undefined): unknown {
  if (Array.isArray(normalized)) return normalized;
  if (!object) return undefined;
  if (Array.isArray(object.scenes)) return object.scenes;
  for (const key of ['items', 'results', 'scenesList', 'scriptScenes', 'segments']) {
    const value = object[key];
    if (Array.isArray(value)) return value;
  }
  return undefined;
}

function coerceScene(item: unknown, index: number, wpm: number): GeneratedScene | null {
  if (!isRecord(item)) return null;

  const title = firstString(item.title, item.heading, item.name) ?? `Scene ${index + 1}`;
  const script = firstString(item.script, item.content, item.text, item.dialogue, item.narration, item.body) ?? '';
  const notes = firstString(item.notes, item.note) ?? undefined;

  // Entries with no script, no custom title, and no notes carry nothing usable.
  if (!script && title === `Scene ${index + 1}` && !notes) return null;

  const role = normalizeRole(item.role, index);
  const estimatedDuration = parseDuration(
    item.estimatedDuration ?? item.estimatedDurationSec ?? item.duration,
    script,
    wpm,
  );

  return { title, role, script, estimatedDuration, notes };
}

function normalizeRole(value: unknown, index: number): SceneRole {
  const raw = firstString(value);
  if (!raw) return index === 0 ? 'hook' : 'point';

  const canonical = raw.toLowerCase().replace(/[^a-z]/g, '');
  if ((VALID_ROLES as string[]).includes(canonical)) return canonical as SceneRole;

  const alias: Record<string, SceneRole> = {
    opening: 'hook', attentiongrabber: 'hook', grabber: 'hook',
    introduction: 'intro', open: 'intro',
    context: 'setup', setup: 'setup',
    keypoint: 'point', point: 'point', main: 'point', body: 'point', argument: 'point', step: 'point',
    demonstration: 'demo', demo: 'demo',
    transition: 'transition', bridge: 'transition', segue: 'transition',
    calltoaction: 'cta', cta: 'cta',
    conclusion: 'outro', outro: 'outro', ending: 'outro', closer: 'outro', closing: 'outro',
  };
  return alias[canonical] ?? (index === 0 ? 'hook' : 'point');
}

/** Convert a loose duration value to seconds, falling back to a word-count estimate. */
function parseDuration(value: unknown, script: string, wpm: number): number {
  const seconds = toSeconds(value);
  if (seconds !== undefined) return seconds;

  const words = script.split(/\s+/).filter(Boolean).length;
  return Math.max(5, Math.round((words / wpm) * 60));
}

function toSeconds(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return Math.round(value);
  if (typeof value !== 'string') return undefined;

  const raw = value.trim().toLowerCase();
  if (!raw) return undefined;

  const mmss = raw.match(/^(\d+):(\d{1,2})$/);
  if (mmss) {
    const seconds = Number(mmss[1]) * 60 + Number(mmss[2]);
    if (Number.isFinite(seconds)) return seconds;
  }

  const match = raw.match(/\d+(?:\.\d+)?/);
  if (!match) return undefined;
  const num = Number(match[0]);
  if (!Number.isFinite(num)) return undefined;

  if (/\bmin(?:ute)?s?\b/.test(raw)) return Math.round(num * 60);
  if (/\bh(?:ou)?rs?\b/.test(raw)) return Math.round(num * 3600);
  return Math.round(num);
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

function unwrapGeneratedScript(raw: unknown): unknown {
  let value = raw;
  for (let depth = 0; depth < 4; depth++) {
    if (typeof value === 'string') {
      try {
        value = JSON.parse(value);
        continue;
      } catch {
        return value;
      }
    }

    if (Array.isArray(value)) return Array.from(value);
    if (!value || typeof value !== 'object') return value;

    const object = value as Record<string, unknown>;
    if (Array.isArray(object.scenes)) return object;

    const nested =
      object.data ?? object.result ?? object.output ?? object.response ??
      object.content ?? object.message ?? object.generations ??
      object.script ?? object.screenplay;
    if (nested === undefined) return value;
    value = nested;
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}