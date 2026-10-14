// src/app/core/services/autosave.service.ts
import { Injectable, effect, inject } from '@angular/core';
import { TabsService } from '../tabs/tabs.service';
import { SettingsService } from '../settings/settings.service';

/** Keeps a crash-safe copy of every open tab in the app's user data folder. */
@Injectable({ providedIn: 'root' })
export class AutosaveService {
  private tabs = inject(TabsService);
  private settings = inject(SettingsService);
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => {
      const { enabled, debounceMs } = this.settings.settings().autosave;
      // Reading the documents subscribes to both the tab list and the live project.
      this.tabs.documents();
      clearTimeout(this.timer);
      if (!enabled) return;
      this.timer = setTimeout(() => this.persist(), Math.max(200, debounceMs));
    });

    window.addEventListener('blur', () => {
      if (this.settings.settings().autosave.enabled) this.persist();
    });
  }

  private persist(): void {
    // Serialize the writes: overlapping calls would otherwise race on the same file.
    const documents = this.tabs.documents();
    this.queue = this.queue.then(async () => {
      for (const doc of documents) {
        await window.api.saveProject(doc.project).catch(err => console.error('Autosave failed', err));
      }
    });
  }
  private queue: Promise<void> = Promise.resolve();
}
