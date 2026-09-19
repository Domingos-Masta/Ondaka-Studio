// src/app/features/toast-host/toast-host.component.ts
import { Component, inject } from '@angular/core';
import { ToastService } from '../../core/services/toast/toast.service';


@Component({
  selector: 'app-toast-host',
  standalone: true,
  template: `
    <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      @for (t of toast.items(); track t.id) {
        <div class="pointer-events-auto px-4 py-2 rounded-md text-sm shadow-lg border transition-all"
             [class.bg-surface-1]="t.kind !== 'error'"
             [class.border-surface-3]="t.kind !== 'error'"
             [class.text-zinc-200]="t.kind !== 'error'"
             [class.bg-red-500]="t.kind === 'error'"
             [class.border-red-600]="t.kind === 'error'"
             [class.text-white]="t.kind === 'error'">
          {{ t.message }}
        </div>
      }
    </div>
  `,
})
export class ToastHostComponent {
  readonly toast = inject(ToastService);
}