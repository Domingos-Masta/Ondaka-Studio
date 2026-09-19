// src/app/core/services/layout.service.ts
import { Injectable, computed, signal } from '@angular/core';

export type CollapsiblePanel = 'left' | 'right';

@Injectable({ providedIn: 'root' })
export class LayoutService {
  readonly leftOpen  = signal(true);
  readonly rightOpen = signal(true);

  /** CSS custom properties bound to the grid-template-columns value. */
  readonly leftWidth  = computed(() => (this.leftOpen()  ? '280px' : '0px'));
  readonly rightWidth = computed(() => (this.rightOpen() ? '300px' : '0px'));

  readonly gridTemplate = computed(
    () => `${this.leftWidth()} minmax(0, 1fr) ${this.rightWidth()}`
  );

  toggle(panel: CollapsiblePanel) {
    if (panel === 'left')  this.leftOpen.update(v => !v);
    if (panel === 'right') this.rightOpen.update(v => !v);
  }

  toggleAll() {
    const anyOpen = this.leftOpen() || this.rightOpen();
    this.leftOpen.set(!anyOpen);
    this.rightOpen.set(!anyOpen);
  }
}