import { Injectable, inject } from '@angular/core';
import { createAdapter } from './ai-adapter.factory';
import { SettingsService } from '../../../services/settings/settings.service';
import { ToastService } from '../../../services/toast/toast.service';
import { AiProviderConfig } from '../../app-settings.model';
import { AiCompletionRequest, AiCompletionResponse, AiError } from '../ai-provider.interface';

@Injectable({ providedIn: 'root' })
export class AiService {
  private settings = inject(SettingsService);
  private toast = inject(ToastService);

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
    const adapter = createAdapter(cfg.type);
    try {
      return await adapter.complete(cfg, req);
    } catch (err) {
      if (err instanceof AiError) throw err;
      throw new AiError(`AI request failed: ${(err as Error).message}`);
    }
  }

  async test(config: AiProviderConfig): Promise<boolean> {
    return createAdapter(config.type).test(config);
  }
}