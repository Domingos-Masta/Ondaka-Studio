import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SelectionAction = 'improve' | 'rewrite' | 'expand' | 'shorten' | 'custom';

@Component({
  selector: 'app-selection-menu',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="absolute z-40 flex flex-col rounded-lg border border-neutral-700 bg-neutral-900/95 py-1 text-sm text-neutral-100 shadow-xl backdrop-blur"
      [style.left.px]="x"
      [style.top.px]="y"
      role="menu"
    >
      <button class="px-3 py-1.5 text-left hover:bg-neutral-800" (click)="emit('improve')">Improve / Humanize</button>
      <button class="px-3 py-1.5 text-left hover:bg-neutral-800" (click)="emit('rewrite')">Rewrite</button>
      <button class="px-3 py-1.5 text-left hover:bg-neutral-800" (click)="emit('expand')">Expand</button>
      <button class="px-3 py-1.5 text-left hover:bg-neutral-800" (click)="emit('shorten')">Shorten</button>
      <div class="my-1 h-px bg-neutral-800"></div>
      <button class="px-3 py-1.5 text-left hover:bg-neutral-800" (click)="emit('custom')">Custom prompt…</button>
    </div>
  `,
})
export class SelectionMenuComponent {
  @Input() x = 0;
  @Input() y = 0;
  @Output() action = new EventEmitter<SelectionAction>();
  @Output() dismiss = new EventEmitter<void>();

  emit(a: SelectionAction) { this.action.emit(a); }
}