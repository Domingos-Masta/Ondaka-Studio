import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ImportService, ParsedImport } from '../../../core/services/import/import.service';
import { AiScriptService } from '../../../core/models/ai/ai-script.service';
import { GeneratedScript } from '../../../core/models/ai/prompts/script-schema';
import { ProjectStore } from '../../../core/services/project/project.store';
import { SettingsService } from '../../../core/services/settings/settings.service';
import { ToastService } from '../../../core/services/toast/toast.service';


type Mode = 'raw' | 'ai';

@Component({
  selector: 'app-import-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" (click)="toClose.emit()">
      <div class="flex h-[80vh] w-[900px] max-w-[95vw] flex-col rounded-xl border border-neutral-700 bg-neutral-900 p-5 shadow-2xl"
           (click)="$event.stopPropagation()">
        <h2 class="mb-4 text-lg font-semibold text-neutral-100">Import Script</h2>

        <div class="mb-3 flex items-center gap-3">
          <input type="file" accept=".txt,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                 (change)="onFile($event)"
                 class="block text-sm text-neutral-300 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-700 file:px-3 file:py-1.5 file:text-neutral-100" />
          @if (parsed()) {
            <span class="text-xs text-neutral-400">{{ wordCount }} words</span>
          }
        </div>

        <div class="mb-3 flex gap-2">
          <button class="rounded-md px-3 py-1.5 text-sm"
                  [class.bg-indigo-600]="mode()==='ai'" [class.text-white]="mode()==='ai'"
                  [class.bg-neutral-800]="mode()!=='ai'" [class.text-neutral-300]="mode()!=='ai'"
                  (click)="mode.set('ai')">AI Adapt</button>
          <button class="rounded-md px-3 py-1.5 text-sm"
                  [class.bg-indigo-600]="mode()==='raw'" [class.text-white]="mode()==='raw'"
                  [class.bg-neutral-800]="mode()!=='raw'" [class.text-neutral-300]="mode()!=='raw'"
                  (click)="mode.set('raw')">Raw Import</button>
        </div>

        <div class="flex-1 overflow-auto rounded-md border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-200">
          @if (!parsed()) {
            <div class="text-neutral-500">Choose a .txt or .docx file to preview it here.</div>
          } @else if (preview(); as p) {
            @for (s of p.scenes; track $index) {
              <div class="mb-3 border-l-2 border-indigo-500 pl-3">
                <div class="text-xs uppercase tracking-wide text-neutral-400">{{ s.role }} · ~{{ s.estimatedDuration }}s</div>
                <div class="font-medium text-neutral-200">{{ s.title }}</div>
                <div class="mt-1 whitespace-pre-wrap text-neutral-400">{{ s.script }}</div>
              </div>
            }
          } @else {
            <div [innerHTML]="parsed()!.html"></div>
          }
        </div>

        <div class="mt-4 flex items-center justify-end gap-2">
          <label class="mr-auto flex items-center gap-2 text-sm text-neutral-300">
            <input type="checkbox" [(ngModel)]="replaceExisting" />
            Replace existing scenes
          </label>
          <button class="rounded-md border border-neutral-700 px-3 py-1.5 text-neutral-300 hover:bg-neutral-800"
                  (click)="toClose.emit()">Cancel</button>
          @if (mode()==='ai' && !preview()) {
            <button class="rounded-md bg-indigo-600 px-4 py-1.5 font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                    [disabled]="!parsed() || busy()"
                    (click)="adapt()">{{ busy() ? 'Adapting…' : 'Adapt with AI' }}</button>
          } @else {
            <button class="rounded-md bg-emerald-600 px-4 py-1.5 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                    [disabled]="!parsed() || busy()"
                    (click)="commit()">Import</button>
          }
        </div>
      </div>
    </div>
  `,
})
export class ImportDialogComponent {
  @Output() toClose = new EventEmitter<void>();

  private importSvc = inject(ImportService);
  private aiScript = inject(AiScriptService);
  private settings = inject(SettingsService);
  private store = inject(ProjectStore);
  private toast = inject(ToastService);

  readonly parsed = signal<ParsedImport | null>(null);
  readonly preview = signal<GeneratedScript | null>(null);
  readonly mode = signal<Mode>('ai');
  readonly busy = signal(false);
  replaceExisting = false;

  get wordCount(): number {
    return this.parsed()?.text.trim().split(/\s+/).filter(Boolean).length ?? 0;
  }

  async onFile(ev: Event): Promise<void> {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.preview.set(null);
    try {
      this.parsed.set(await this.importSvc.parseFile(file));
    } catch (err) {
      this.toast.show((err as Error).message, 'error');
    }
  }

  async adapt(): Promise<void> {
    const p = this.parsed();
    if (!p) return;
    this.busy.set(true);
    try {
      this.preview.set(await this.aiScript.adaptImport(p.text));
    } catch (err) {
      this.toast.show((err as Error).message, 'error');
    } finally {
      this.busy.set(false);
    }
  }

  commit(): void {
    const s = this.settings.settings();
    const p = this.preview();
    const raw = this.parsed();
    if (!p && !raw) return;

    if (this.replaceExisting) this.store.clearScenes();

    if (p) {
      this.store.insertGeneratedScenes(p.scenes, s.timing.defaultScenePause);
      this.toast.show(`Imported ${p.scenes.length} adapted scenes.`);
    } else if (raw) {
      this.store.insertGeneratedScenes(
        [{ title: 'Imported', role: 'point', script: raw.text, estimatedDuration: 60 }],
        s.timing.defaultScenePause
      );
      this.toast.show('Imported as a single scene.');
    }
    this.toClose.emit();
  }
}