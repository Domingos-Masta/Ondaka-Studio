import { SceneBlock } from "./scene-block.model";

export type SceneRole =
  | 'hook' | 'intro' | 'setup' | 'point'
  | 'demo' | 'transition' | 'cta' | 'outro';

export type SceneLock = 'none' | 'script' | 'time';

export interface SceneAsset {
  id: string;
  type: 'broll' | 'image' | 'audio' | 'link' | 'graphic';
  path: string;
  label: string;
}

export interface Scene {
  id: string;
  order: number;
  title: string;
  role: SceneRole;
  script: string;              // Quill HTML
  targetDurationSec: number;
  pauseSec: number;
  lock: SceneLock;
  notes: string;
  aiRevisions?: AiRevision[];
  assets: SceneAsset[];
}

export interface Take {
  id: string;
  sceneId: string | null;      // null = full run-through
  filePath: string;
  durationSec: number;
  wordCount: number;
  achievedWpm: number;
  recordedAt: string;          // ISO
}

export interface VideoProject {
  id: string;
  title: string;
  targetDurationSec: number;
  speakingWpm: number;
  scenes: Scene[];
  takes: Take[];
  createdAt: string;
  updatedAt: string;
  blocks: SceneBlock[]; 
}

export interface AiRevision {
  id: string;
  action: string;
  original: string;
  replacement: string;
  providerId: string;
  timestamp: string;
}

export function toEditorHtml(value: unknown): string {
  const text = String(value ?? '');
  if (!text) return '';
  if (/<(?:p|div|br|h[1-6]|ul|ol|li|blockquote)\b[^>]*>/i.test(text)) return text;

  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .split(/\n{2,}/)
    .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('');
}


export const ROLE_META: Record<SceneRole, { label: string; color: string; hint: string }> = {
  hook:       { label: 'Hook',       color: '#ef4444', hint: 'First 5–10s. Grab attention.' },
  intro:      { label: 'Intro',      color: '#f59e0b', hint: 'Keep under 15s.' },
  setup:      { label: 'Setup',      color: '#6366f1', hint: 'Context and promise.' },
  point:      { label: 'Point',      color: '#22c55e', hint: 'Main argument or step.' },
  demo:       { label: 'Demo',       color: '#06b6d4', hint: 'Show, don’t tell.' },
  transition: { label: 'Transition', color: '#8b5cf6', hint: 'Bridge between points.' },
  cta:        { label: 'CTA',        color: '#ec4899', hint: 'One clear ask.' },
  outro:      { label: 'Outro',      color: '#71717a', hint: 'Sign-off and next video.' },
};