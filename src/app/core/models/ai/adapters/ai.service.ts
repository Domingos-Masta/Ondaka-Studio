import { Injectable, inject } from '@angular/core';
import { SettingsService } from '../../../services/settings/settings.service';
import { AiProviderConfig } from '../../app-settings.model';
import { AiCompletionRequest, AiCompletionResponse, AiError } from '../ai-provider.interface';

/**
 * Talks to AI providers through the main process, which holds the API keys —
 * they never enter the renderer.
 */
@Injectable({ providedIn: 'root' })
export class AiService {
  private settings = inject(SettingsService);

  resolveProvider(providerId?: string): AiProviderConfig {
    const s = this.settings.settings();
    const cfg = providerId
      ? s.providers.find(p => p.id === providerId)
      : s.providers.find(p => p.id === s.defaultProviderId);
    if (!cfg) throw new AiError('No AI provider configured. Open Settings to add one.');
    if (!cfg.enabled) throw new AiError(`Provider "${cfg.name}" is disabled.`);
    return cfg;
  }

  async complete(req: AiCompletionRequest, providerId?: string): Promise<AiCompletionResponse> {
    const cfg = this.resolveProvider(providerId);
    try {
      return await window.api.ai.complete({ providerId: cfg.id, request: req }) as AiCompletionResponse;
    } catch (err) {
      throw new AiError(`AI request failed: ${ipcMessage(err)}`, { cause: err });
    }
  }

  /** Used by the settings dialog to verify a provider — including a key the user just typed. */
  async test(config: AiProviderConfig): Promise<boolean> {
    try {
      return await window.api.ai.test({ provider: config });
    } catch (err) {
      throw new Error(ipcMessage(err), { cause: err });
    }
  }
}

/** Electron wraps IPC failures in `Error invoking remote method '<channel>': Error: …`. */
function ipcMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  return message.replace(/^Error invoking remote method '[^']*':\s*/, '').replace(/^Error:\s*/, '');
}
