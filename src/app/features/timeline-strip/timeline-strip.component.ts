// src/app/features/timeline-strip/timeline-strip.component.ts
import { Component, computed, inject } from '@angular/core';
import { ProjectStore } from '../../core/services/project/project.store';
import { TimingService } from '../../core/services/timing/timing.service';
import { ROLE_META } from '../../core/models/project.model';

@Component({
  selector: 'app-timeline-strip',
  standalone: true,
  template: `
    <div class="h-14 px-4 py-2 flex items-center gap-3 text-xs">
      <div class="text-zinc-500 tabular-nums shrink-0">
        {{ format(total()) }} total
      </div>

      <div class="flex-1 h-6 rounded overflow-hidden bg-surface-2 flex">
        @for (item of store.scenesWithTiming(); track item.scene.id) {
          <div
            class="h-full border-r border-surface-0/50 last:border-0 flex items-center px-1.5 truncate"
            [style.flex]="item.timing.estimatedSec"
            [style.background]="colorFor(item.scene.role)"
            [title]="item.scene.title + ' — ' + format(item.timing.estimatedSec)">
            <span class="text-[10px] text-white/90 truncate">
              {{ item.scene.title }}
            </span>
          </div>
        }
      </div>

      <div class="text-zinc-500 tabular-nums shrink-0">
        {{ format(store.totalEstimatedSec()) }} est
      </div>
    </div>
  `,
})
export class TimelineStripComponent {
  readonly store = inject(ProjectStore);
  private timing = inject(TimingService);

  readonly total = computed(() => this.store.totalEstimatedSec());

  colorFor(role: keyof typeof ROLE_META) { return ROLE_META[role].color; }
  format(sec: number) { return this.timing.formatTime(sec); }
}