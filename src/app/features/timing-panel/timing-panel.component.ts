// src/app/features/timing-panel/timing-panel.component.ts
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProjectStore } from '../../core/services/project/project.store';
import { TimingService } from '../../core/services/timing/timing.service';
import { SelectionService } from '../../core/services/selection/selection.service';
import { ORIENTATIONS, PROJECT_TYPES, projectTypeInfo } from '../../core/models/project.model';

@Component({
  selector: 'app-timing-panel',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="h-full flex flex-col p-4 gap-5 text-sm overflow-y-auto">
      <section>
        <h3 class="panel-title">Notes</h3>
        <div class="flex gap-1 mb-2">
          <button class="seg" [class.active]="noteTarget() === 'scene'"
                  (click)="noteTarget.set('scene')">Scene</button>
          <button class="seg" [class.active]="noteTarget() === 'block'"
                  (click)="noteTarget.set('block')">Block</button>
        </div>

        @if (noteTarget() === 'scene') {
          @if (selectedScene(); as scene) {
            <div class="text-xs text-zinc-400 mb-1 truncate">{{ scene.title }}</div>
            <textarea class="note-input" rows="6"
                      [ngModel]="scene.notes"
                      (ngModelChange)="store.updateScene(scene.id, { notes: $event })"
                      placeholder="Camera moves, effects, extra details…"></textarea>
          } @else {
            <div class="text-xs text-zinc-600">Select a scene to add notes.</div>
          }
        } @else {
          @if (store.blocks().length) {
            <select class="note-select mb-2"
                    [ngModel]="effectiveBlockId()"
                    (ngModelChange)="selectedBlockId.set($event)">
              @for (b of store.blocks(); track b.id) {
                <option [value]="b.id">{{ b.title }}</option>
              }
            </select>
            @if (selectedBlock(); as block) {
              <textarea class="note-input" rows="6"
                        [ngModel]="block.notes"
                        (ngModelChange)="store.updateBlock(block.id, { notes: $event })"
                        placeholder="Camera moves, effects, extra details…"></textarea>
            }
          } @else {
            <div class="text-xs text-zinc-600">No blocks yet. Group scenes to create blocks.</div>
          }
        }
      </section>

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
        <h3 class="panel-title">Type & limit</h3>
        <select class="note-select mb-2"
                [ngModel]="store.project().type ?? 'youtube-series'"
                (ngModelChange)="store.updateProjectType($event)">
          @for (t of types; track t.id) {
            <option [value]="t.id">{{ t.icon }} {{ t.label }} — {{ format(t.recommendedSec) }}</option>
          }
        </select>

        @if ((store.project().type ?? 'youtube-series') === 'others') {
          <label class="field mb-2">
            <span>Limit (s)</span>
            <input type="number" min="1" step="5"
                   [ngModel]="store.limitSec()"
                   (ngModelChange)="store.patch({ limitSecOverride: +$event })" />
          </label>
        }

        <select class="note-select mb-2"
                [ngModel]="store.project().orientation ?? 'landscape'"
                (ngModelChange)="store.patch({ orientation: $event })">
          @for (o of orientations; track o.id) {
            <option [value]="o.id">{{ o.icon }} {{ o.label }}</option>
          }
        </select>

        <div class="flex justify-between tabular-nums" [class.text-over]="store.overLimit()">
          <span class="text-zinc-500">Words</span>
          <span>{{ store.totalWordCount() }} / {{ store.limitWordBudget() }}</span>
        </div>
        <div class="flex justify-between tabular-nums" [class.text-over]="store.overLimit()">
          <span class="text-zinc-500">Time</span>
          <span>{{ format(store.totalEstimatedSec()) }} / {{ format(store.limitSec()) }}</span>
        </div>
        @if (store.overLimit()) {
          <p class="mt-2 rounded border border-over/30 bg-over/10 px-2 py-1.5 text-[11px] leading-snug text-over">
            ⚠ Script exceeds the recommended {{ typeInfo().label.toLowerCase() }} limit — trim scenes or pick a longer category.
          </p>
        }
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
    .seg { @apply flex-1 text-xs px-2 py-1.5 rounded bg-surface-2 text-zinc-300 hover:bg-surface-3 transition; }
    .seg.active { @apply bg-accent/20 text-accent; }
    .note-input { @apply w-full bg-surface-2 rounded-md px-3 py-2 text-sm text-zinc-200 outline-none focus:ring-1 focus:ring-accent resize-y leading-relaxed; }
    .note-select { @apply w-full bg-surface-2 rounded px-2 py-1.5 text-sm text-zinc-200 outline-none focus:ring-1 focus:ring-accent; }
  `],
})
export class TimingPanelComponent {
  readonly store = inject(ProjectStore);
  private timing = inject(TimingService);
  readonly selection = inject(SelectionService);
  readonly Math = Math;

  readonly noteTarget = signal<'scene' | 'block'>('scene');
  readonly selectedBlockId = signal<string>('');

  readonly types = PROJECT_TYPES;
  readonly orientations = ORIENTATIONS;
  readonly typeInfo = computed(() => projectTypeInfo(this.store.project().type));

  readonly selectedScene = this.selection.selected;

  readonly effectiveBlockId = computed(() => {
    const blocks = this.store.blocks();
    const current = this.selectedBlockId();
    if (blocks.some(b => b.id === current)) return current;
    return blocks[0]?.id ?? '';
  });

  readonly selectedBlock = computed(() =>
    this.store.blocks().find(b => b.id === this.effectiveBlockId()) ?? null
  );

  totalDelta() {
    return Math.round(this.store.totalEstimatedSec() - this.store.totalTargetSec());
  }

  format(sec: number) { return this.timing.formatTime(sec); }
}