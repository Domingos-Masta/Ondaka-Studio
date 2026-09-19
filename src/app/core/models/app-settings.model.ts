export type AiProviderType = 'openai' | 'gemini' | 'deepseek' | 'anthropic' | 'custom';

export interface AiProviderConfig {
  id: string;
  name: string;
  type: AiProviderType;
  baseUrl: string;
  apiKey: string;
  model: string;
  enabled: boolean;
  createdAt: string;
}

export interface AppSettings {
  providers: AiProviderConfig[];
  defaultProviderId: string | null;
  prompts: {
    selectedText: string;
    titleToScript: string;
    importAdapt: string;
    systemBase: string;
  };
  editor: {
    fontSize: number;
    fontFamily: string;
    lineWidth: number;
  };
  presenter: {
    mode: 'sequence' | 'timed';
    fontSize: number;
    mirror: boolean;
  };
  timing: {
    defaultWpm: number;
    defaultScenePause: number;
  };
  autosave: {
    enabled: boolean;
    debounceMs: number;
  };
  layout: {
    leftCollapsed: boolean;
    rightCollapsed: boolean;
  };
}

export const DEFAULT_PROMPTS = {
  systemBase:
    'You are an expert YouTube scriptwriter and editor. You write for spoken delivery, not for reading. Be concise, natural, and conversational. Never use filler like "in this video" or "make sure to". Follow formatting instructions exactly.',
  selectedText:
    'Rewrite the following script passage to sound more natural and conversational for a YouTube video. Keep the same meaning and approximate length. Return only the rewritten text, no explanations.\n\n---\n{{selection}}\n---',
  titleToScript:
    'Video title: {{title}}\nTarget duration: {{targetDuration}} seconds\nTone: {{tone}}\nKey points to cover: {{keyPoints}}\n\nProduce a scene-by-scene script breakdown.',
  importAdapt:
    'Adapt the following raw content into a YouTube script with scene structure. Preserve all key information, rewrite for spoken delivery.\n\n---\n{{content}}\n---',
};

export const DEFAULT_SETTINGS: AppSettings = {
  providers: [],
  defaultProviderId: null,
  prompts: { ...DEFAULT_PROMPTS },
  editor: { fontSize: 17, fontFamily: 'Inter, system-ui, sans-serif', lineWidth: 72 },
  presenter: { mode: 'sequence', fontSize: 42, mirror: false },
  timing: { defaultWpm: 150, defaultScenePause: 0.5 },
  autosave: { enabled: true, debounceMs: 800 },
  layout: { leftCollapsed: false, rightCollapsed: false },
};