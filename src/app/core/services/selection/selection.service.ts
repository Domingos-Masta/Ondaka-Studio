// src/app/core/services/selection.service.ts
import { Injectable, computed, inject, signal } from '@angular/core';
import { ProjectStore } from '../project/project.store';
import { Scene } from '../../models/project.model';


@Injectable({ providedIn: 'root' })
export class SelectionService {
  private store = inject(ProjectStore);

  private readonly _id = signal<string | null>(null);

  /** Auto-fallback to first scene when nothing is selected or selection is stale. */
  readonly selectedId = computed(() => {
    const id = this._id();
    const scenes = this.store.scenes();
    if (id && scenes.some(s => s.id === id)) return id;
    return scenes[0]?.id ?? null;
  });

  readonly selected = computed<Scene | null>(() => {
    const id = this.selectedId();
    return id ? this.store.scenes().find(s => s.id === id) ?? null : null;
  });

  readonly selectedIndex = computed(() =>
    this.store.scenes().findIndex(s => s.id === this.selectedId())
  );

  select(id: string | null | undefined) {
    if (!id) return;
    this._id.set(id);
  }

  next() {
    const scenes = this.store.scenes();
    const i = this.selectedIndex();
    if (i >= 0 && i < scenes.length - 1) this._id.set(scenes[i + 1].id);
  }

  prev() {
    const scenes = this.store.scenes();
    const i = this.selectedIndex();
    if (i > 0) this._id.set(scenes[i - 1].id);
  }

  /** Called after removing a scene so selection doesn't point at a ghost. */
  clear() { this._id.set(null); }
}