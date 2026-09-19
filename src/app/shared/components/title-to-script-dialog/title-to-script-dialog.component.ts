import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiScriptService } from '../../../core/models/ai/ai-script.service';
import { GeneratedScript } from '../../../core/models/ai/prompts/script-schema';
import { ProjectStore } from '../../../core/services/project/project.store';
import { SettingsService } from '../../../core/services/settings/settings.service';
import { ToastService } from '../../../core/services/toast/toast.service';


@Component({
  selector: 'app-title-to-script-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" (click)="toClose.emit()">
      <div class="w-[720px] max-w-[90vw] rounded-xl border border-neutral-700 bg-neutral-900 p-5 shadow-2xl"
           (click)="$event.stopPropagation()">
        <h2 class="mb-4 text-lg font-semibold text-neutral-100">Generate Script from Title</h2>

        <div class="grid grid-cols-2 gap-3">
          <label class="col-span-2 block">
            <span class="mb-1 block text-xs uppercase tracking-wide text-neutral-400">Video Title</span>
            <input [(ngModel)]="title" class="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none focus:border-indigo-500" />
          </label>
          <label class="block">
            <span class="mb-1 block text-xs uppercase tracking-wide text-neutral-400">Target Duration (s)</span>
            <input type="number" [(ngModel)]="targetDuration" class="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100" />
          </label>
          <label class="block">
            <span class="mb-1 block text-xs uppercase tracking-wide text-neutral-400">Tone</span>
            <input [(ngModel)]="tone" placeholder="e.g. energetic, calm, technical" class="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100" />
          </label>
          <label class="col-span-2 block">
            <span class="mb-1 block text-xs uppercase tracking-wide text-neutral-400">Key Points (one per line)</span>
            <textarea rows="3" [(ngModel)]="keyPoints" class="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100"></textarea>
          </label>
        </div>

        @if (preview(); as p) {
          <div class="mt-4 max-h-72 overflow-auto rounded-md border border-neutral-800 bg-neutral-950 p-3 text-sm text-neutral-200">
            <div class="mb-2 font-medium text-neutral-300">{{ p.scenes.length }} scenes</div>
            @for (s of p.scenes; track $index) {
              <div class="mb-2 border-l-2 border-indigo-500 pl-3">
                <div class="text-xs uppercase tracking-wide text-neutral-400">{{ s.role }} · ~{{ s.estimatedDuration }}s</div>
                <div class="font-medium text-neutral-200">{{ s.title }}</div>
                <div class="mt-1 whitespace-pre-wrap text-neutral-400">{{ s.script | slice:0:200 }}{{ s.script.length > 200 ? '…' : '' }}</div>
              </div>
            }
          </div>
        }

        <div class="mt-5 flex items-center justify-end gap-2">
          @if (!preview()) {
            <button class="rounded-md border border-neutral-700 px-3 py-1.5 text-neutral-300 hover:bg-neutral-800"
                    (click)="toClose.emit()">Cancel</button>
            <button class="rounded-md bg-indigo-600 px-4 py-1.5 font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                    [disabled]="!title.trim() || busy()"
                    (click)="generate()">{{ busy() ? 'Generating…' : 'Generate' }}</button>
          } @else {
            <button class="rounded-md border border-neutral-700 px-3 py-1.5 text-neutral-300 hover:bg-neutral-800"
                    (click)="preview.set(null)">Back</button>
            <button class="rounded-md border border-neutral-700 px-3 py-1.5 text-neutral-300 hover:bg-neutral-800"
                    (click)="regenerate()">Regenerate</button>
            <button class="rounded-md bg-emerald-600 px-4 py-1.5 font-medium text-white hover:bg-emerald-500"
                    (click)="insert()">Insert Scenes</button>
          }
        </div>
      </div>
    </div>
  `,
})
export class TitleToScriptDialogComponent {
  @Output() toClose = new EventEmitter<void>();

  private aiScript = inject(AiScriptService);
  private settings = inject(SettingsService);
  private store = inject(ProjectStore);
  private toast = inject(ToastService);

  title = '';
  targetDuration = 480;
  tone = '';
  keyPoints = '';

  readonly busy = signal(false);
  readonly preview = signal<GeneratedScript | null>(null);

  async generate(): Promise<void> {
    this.busy.set(true);
    try {
      this.preview.set(await this.aiScript.generateFromTitle({
        title: this.title,
        targetDuration: this.targetDuration,
        tone: this.tone,
        keyPoints: this.keyPoints,
      }));
    } catch (err) {
      this.toast.show((err as Error).message, 'error');
    } finally {
      this.busy.set(false);
    }
  }

  regenerate(): void {
    this.preview.set(null);
    void this.generate();
  }

  insert(): void {
    const p = this.preview();
    if (!p) return;
    const s = this.settings.settings();
    this.store.insertGeneratedScenes(p.scenes, s.timing.defaultScenePause);
    this.toast.show(`Inserted ${p.scenes.length} scenes.`);
    this.toClose.emit();
  }
}