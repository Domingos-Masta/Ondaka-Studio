// src/app/core/services/organize/organize.service.ts
import { Injectable, computed, signal } from '@angular/core';

/**
 * Holds the "organize" mode state for the scene list.
 * When active, the scene list switches from single-selection (editor focus)
 * to multi-selection for block management (group / remove / create blocks).
 */
@Injectable({ providedIn: 'root' })
export class OrganizeService {
  private readonly _active = signal(false);
  readonly active = this._active.asReadonly();

  private readonly _selectedIds = signal<Set<string>>(new Set());
  readonly selectedSet = this._selectedIds.asReadonly();
  readonly selectedIds = computed(() => [...this._selectedIds()]);
  readonly selectedCount = computed(() => this._selectedIds().size);

  toggle(): void {
    this._active.update(v => !v);
    this.clearSelection();
  }

  activate(): void { this._active.set(true); }

  deactivate(): void {
    this._active.set(false);
    this.clearSelection();
  }

  toggleScene(id: string): void {
    this._selectedIds.update(set => {
      const next = new Set(set);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  clearSelection(): void {
    this._selectedIds.set(new Set());
  }
}
