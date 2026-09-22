import { Injectable, computed, signal } from '@angular/core';
import type { ProjectTemplate } from '../../models/template.model';
import { BUILTIN_TEMPLATES } from '../../models/templates.builtin';

@Injectable({ providedIn: 'root' })
export class TemplatesService {
  private readonly _user = signal<ProjectTemplate[]>([]);
  private loaded = false;

  readonly userTemplates = this._user.asReadonly();
  readonly all = computed(() => [...BUILTIN_TEMPLATES, ...this._user()]);

  async load(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const stored = await window.api.templates.getAll();
      this._user.set(Array.isArray(stored) ? (stored as ProjectTemplate[]) : []);
    } catch (err) {
      console.error('[TemplatesService] load failed', err);
      this._user.set([]);
    }
  }

  async save(template: ProjectTemplate): Promise<void> {
    const next = [template, ...this._user().filter((t) => t.id !== template.id)];
    this._user.set(next);
    await this.persist();
  }

  async remove(id: string): Promise<void> {
    this._user.set(this._user().filter((t) => t.id !== id));
    await this.persist();
  }

  private async persist(): Promise<void> {
    try {
      await window.api.templates.saveAll(this._user());
    } catch (err) {
      console.error('[TemplatesService] persist failed', err);
    }
  }
}
