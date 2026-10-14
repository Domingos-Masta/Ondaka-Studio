import { Injectable, computed, signal } from '@angular/core';
import {
  AppSettings,
  DEFAULT_SETTINGS,
  AiProviderConfig,
} from '../../models/app-settings.model';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly _settings = signal<AppSettings>(DEFAULT_SETTINGS);
  private loaded = false;

  readonly settings = this._settings.asReadonly();
  readonly activeProvider = computed<AiProviderConfig | null>(() => {
    const s = this._settings();
    return s.providers.find(p => p.id === s.defaultProviderId && p.enabled) ?? null;
  });

  async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const stored = await window.api.settings.getAll();
      this._settings.set(this.merge(DEFAULT_SETTINGS, stored));
      this.loaded = true;
    } catch (err) {
      console.error('[SettingsService] load failed', err);
      this._settings.set(DEFAULT_SETTINGS);
      this.loaded = true;
    }
  }

  async patch(partial: Partial<AppSettings>): Promise<void> {
    const next = this.merge(this._settings(), partial);
    this._settings.set(next);
    try {
      await window.api.settings.patch(partial);
    } catch (err) {
      console.error('[SettingsService] persist failed', err);
    }
  }

  // Convenience helpers
  async addProvider(cfg: Omit<AiProviderConfig, 'id' | 'createdAt'>): Promise<AiProviderConfig> {
    const provider: AiProviderConfig = {
      ...cfg,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    await this.patch({ providers: [...this._settings().providers, provider] });
    return provider;
  }

  async updateProvider(id: string, patch: Partial<AiProviderConfig>): Promise<void> {
    // The main process owns the key; mirror only what the UI needs to know.
    const providers = this._settings().providers.map(p => {
      if (p.id !== id) return p;
      const next = { ...p, ...patch };
      if (typeof patch.apiKey === 'string') next.hasApiKey = patch.apiKey.length > 0;
      return next;
    });
    await this.patch({ providers });
  }

  async removeProvider(id: string): Promise<void> {
    const providers = this._settings().providers.filter(p => p.id !== id);
    const defaultProviderId =
      this._settings().defaultProviderId === id ? null : this._settings().defaultProviderId;
    await this.patch({ providers, defaultProviderId });
  }

  private merge(base: AppSettings, patch: Partial<AppSettings>): AppSettings {
    return {
      ...base,
      ...patch,
      prompts: { ...base.prompts, ...(patch.prompts ?? {}) },
      editor: { ...base.editor, ...(patch.editor ?? {}) },
      presenter: { ...base.presenter, ...(patch.presenter ?? {}) },
      timing: { ...base.timing, ...(patch.timing ?? {}) },
      autosave: { ...base.autosave, ...(patch.autosave ?? {}) },
      layout: { ...base.layout, ...(patch.layout ?? {}) },
      providers: patch.providers ?? base.providers,
    };
  }
}