// src/app/features/timing-panel/timing-panel.component.ts
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProjectStore } from '../../core/services/project/project.store';
import { TimingService } from '../../core/services/timing/timing.service';

@Component({
  selector: 'app-timing-panel',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="h-full flex flex-col p-4 gap-5 text-sm">
      <section>
        <h3 class="panel-title">Plan</h3>
        <div class="grid grid-cols-2 gap-2">
          <label class="field">
            <span>Target (s)</span>
            <input type="number" min="0" step="5"
                   [ngModel]="store.project().targetDurationSec"
                   (ngModelChange)="store.patch({ targetDurationSec: +$event })" />
          </label>
          <label class="field">
            <span>Speaking WPM</span>
            <input type="number" min="60" max="260"
                   [ngModel]="store.project().speakingWpm"
                   (ngModelChange)="store.patch({ speakingWpm: +$event })" />
          </label>
        </div>
      </section>

      <section>
        <h3 class="panel-title">Actual structure</h3>
        <div class="flex justify-between tabular-nums">
          <span class="text-zinc-500">Estimated</span>
          <span>{{ format(store.totalEstimatedSec()) }}</span>
        </div>
        <div class="flex justify-between tabular-nums">
          <span class="text-zinc-500">Scene targets</span>
          <span>{{ format(store.totalTargetSec()) }}</span>
        </div>
        <div class="flex justify-between tabular-nums"
             [class.text-over]="totalDelta() > 5" [class.text-ok]="Math.abs(totalDelta()) <= 5">
          <span class="text-zinc-500">Delta</span>
          <span>{{ totalDelta() > 0 ? '+' : '' }}{{ totalDelta() }}s</span>
        </div>
      </section>

      <section>
        <h3 class="panel-title">Fitting</h3>
        <button class="btn-block" (click)="store.fitScriptsToTimeline()">
          Fit time → script
        </button>
        <p class="text-[11px] text-zinc-500 mt-1.5 leading-snug">
          Recomputes each unlocked scene’s target duration from its script.
        </p>
      </section>

      <section>
        <h3 class="panel-title">Rehearsal</h3>
        <button class="btn-block" (click)="store.calibrateWpm()">
          Calibrate WPM from takes
        </button>
        <p class="text-[11px] text-zinc-500 mt-1.5 leading-snug">
          Needs at least 3 takes with 30+ words each.
        </p>
      </section>

      <section class="mt-auto">
        <h3 class="panel-title">Takes</h3>
        <div class="text-xs text-zinc-500">
          {{ store.project().takes.length }} recorded
        </div>
      </section>
    </div>
  `,
  styles: [`
    @reference "../../../styles.scss";
    .panel-title { @apply text-[11px] uppercase tracking-wider text-zinc-500 mb-2; }
    .field { @apply flex flex-col gap-1 text-[11px] text-zinc-500; }
    .field input { @apply bg-surface-2 rounded px-2 py-1 text-sm text-zinc-200 outline-none focus:ring-1 focus:ring-accent; }
    .btn-block { @apply w-full text-xs px-3 py-2 rounded-md bg-surface-2 hover:bg-surface-3 text-zinc-200 transition; }
  `],
})
export class TimingPanelComponent {
  readonly store = inject(ProjectStore);
  private timing = inject(TimingService);
  readonly Math = Math;

  totalDelta() {
    return Math.round(this.store.totalEstimatedSec() - this.store.totalTargetSec());
  }

  format(sec: number) { return this.timing.formatTime(sec); }
}