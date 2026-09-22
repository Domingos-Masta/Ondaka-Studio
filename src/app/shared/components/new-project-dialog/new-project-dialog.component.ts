import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ORIENTATIONS, PROJECT_TYPES, projectTypeInfo } from '../../../core/models/project.model';
import type { ProjectType, VideoOrientation } from '../../../core/models/project.model';
import { templateCategoryInfo } from '../../../core/models/template.model';
import type { ProjectTemplate, TemplateCategory } from '../../../core/models/template.model';
import { TemplatesService } from '../../../core/services/templates/templates.service';
import { ProjectIoService } from '../../../core/services/project-io/project-io.service';

@Component({
  selector: 'app-new-project-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" (click)="toClose.emit()">
      <div class="flex h-[85vh] w-[760px] max-w-[94vw] flex-col rounded-xl border border-neutral-700 bg-neutral-900 p-5 shadow-2xl"
           (click)="$event.stopPropagation()">
        <h2 class="mb-1 text-lg font-semibold text-neutral-100">New Project</h2>
        <p class="mb-4 text-xs text-neutral-500">Start from scratch or build from a template with pre-structured scenes.</p>

        <div class="mb-4 flex gap-2">
          <button class="flex-1 rounded-md px-3 py-1.5 text-xs"
                  [class.bg-indigo-600]="mode() === 'scratch'" [class.text-white]="mode() === 'scratch'"
                  [class.bg-neutral-800]="mode() !== 'scratch'" [class.text-neutral-300]="mode() !== 'scratch'"
                  (click)="mode.set('scratch')">From scratch</button>
          <button class="flex-1 rounded-md px-3 py-1.5 text-xs"
                  [class.bg-indigo-600]="mode() === 'template'" [class.text-white]="mode() === 'template'"
                  [class.bg-neutral-800]="mode() !== 'template'" [class.text-neutral-300]="mode() !== 'template'"
                  (click)="mode.set('template')">From template</button>
        </div>

        @if (mode() === 'scratch') {
          <div class="min-h-0 flex-1 overflow-y-auto pr-1">
            <label class="mb-3 block">
              <span class="mb-1 block text-xs uppercase tracking-wide text-neutral-400">Project Title</span>
              <input [(ngModel)]="title" placeholder="Untitled Video"
                     class="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none focus:border-indigo-500" />
            </label>

            <span class="mb-1 block text-xs uppercase tracking-wide text-neutral-400">Category</span>
            <div class="mb-4 grid grid-cols-2 gap-2">
              @for (t of types; track t.id) {
                <button type="button"
                        class="flex items-center gap-2 rounded-lg border p-3 text-left transition"
                        [class.border-indigo-500]="type() === t.id" [class.bg-indigo-500/10]="type() === t.id"
                        [class.border-neutral-700]="type() !== t.id"
                        (click)="selectType(t.id)">
                  <span class="text-xl">{{ t.icon }}</span>
                  <span class="min-w-0 flex-1">
                    <span class="block text-sm font-medium text-neutral-100">{{ t.label }}</span>
                    <span class="block text-[10px] text-neutral-500">{{ t.id === 'others' ? 'Custom length' : formatDuration(t.recommendedSec) }}</span>
                  </span>
                </button>
              }
            </div>

            @if (type() === 'others') {
              <label class="mb-4 block">
                <span class="mb-1 block text-xs uppercase tracking-wide text-neutral-400">Duration (seconds)</span>
                <input type="number" min="1" step="5" [(ngModel)]="customSec"
                       class="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none focus:border-indigo-500" />
              </label>
            }

            <span class="mb-1 block text-xs uppercase tracking-wide text-neutral-400">Orientation</span>
            <div class="grid grid-cols-3 gap-2">
              @for (o of orientations; track o.id) {
                <button type="button"
                        class="rounded-lg border p-2 text-center text-xs transition"
                        [class.border-indigo-500]="orientation() === o.id" [class.bg-indigo-500/10]="orientation() === o.id" [class.text-white]="orientation() === o.id"
                        [class.border-neutral-700]="orientation() !== o.id" [class.text-neutral-300]="orientation() !== o.id"
                        (click)="orientation.set(o.id)">
                  <span class="block text-lg">{{ o.icon }}</span>{{ o.label }}
                </button>
              }
            </div>
          </div>

          <div class="mt-4 flex items-center justify-end gap-2">
            <button class="rounded-md border border-neutral-700 px-3 py-1.5 text-neutral-300 hover:bg-neutral-800" (click)="toClose.emit()">Cancel</button>
            <button class="rounded-md bg-indigo-600 px-4 py-1.5 font-medium text-white hover:bg-indigo-500" (click)="createScratch()">Create</button>
          </div>
        } @else {
          <div class="grid min-h-0 flex-1 grid-cols-[240px_1fr] gap-4">
            <div class="min-h-0 overflow-y-auto pr-1">
              @for (t of templates.all(); track t.id) {
                <button type="button"
                        class="mb-1 block w-full rounded-lg border px-3 py-2 text-left transition"
                        [class.border-indigo-500]="selectedTemplate()?.id === t.id" [class.bg-indigo-500/10]="selectedTemplate()?.id === t.id"
                        [class.border-neutral-700]="selectedTemplate()?.id !== t.id"
                        (click)="selectTemplate(t)">
                  <span class="flex items-center gap-2">
                    <span>{{ categoryIcon(t.category) }}</span>
                    <span class="min-w-0 flex-1">
                      <span class="block truncate text-sm font-medium text-neutral-100">{{ t.name }}</span>
                      <span class="block text-[10px] text-neutral-500">{{ categoryLabel(t.category) }} · {{ t.builtin ? 'built-in' : 'custom' }}</span>
                    </span>
                  </span>
                </button>
              }
            </div>

            <div class="min-h-0 overflow-y-auto border-l border-neutral-800 pl-4">
              @if (selectedTemplate(); as tpl) {
                <div class="mb-1 text-sm font-medium text-neutral-100">{{ tpl.name }}</div>
                <div class="mb-3 text-xs text-neutral-500">{{ tpl.scenes.length }} scenes · {{ categoryLabel(tpl.category) }}</div>
                @for (s of tpl.scenes; track $index) {
                  <div class="mb-2 rounded-md border border-neutral-800 bg-neutral-950 p-2">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-medium text-neutral-200">{{ s.title }}</span>
                      <span class="text-[10px] uppercase text-neutral-500">{{ s.role }} · {{ s.targetDurationSec }}s</span>
                    </div>
                    <div class="mt-1 text-[11px] leading-snug text-neutral-400">{{ s.description }}</div>
                  </div>
                }
              } @else {
                <div class="text-xs text-neutral-500">Select a template to preview its scenes.</div>
              }
            </div>
          </div>

          <div class="mt-4 flex items-center justify-end gap-2">
            <button class="rounded-md border border-neutral-700 px-3 py-1.5 text-neutral-300 hover:bg-neutral-800" (click)="toClose.emit()">Cancel</button>
            <button class="rounded-md bg-indigo-600 px-4 py-1.5 font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                    [disabled]="!selectedTemplate()" (click)="createFromTemplate()">Create from template</button>
          </div>
        }
      </div>
    </div>
  `,
})
export class NewProjectDialogComponent {
  @Output() toClose = new EventEmitter<void>();

  private io = inject(ProjectIoService);
  readonly templates = inject(TemplatesService);

  readonly types = PROJECT_TYPES;
  readonly orientations = ORIENTATIONS;

  readonly mode = signal<'scratch' | 'template'>('scratch');
  readonly title = signal('Untitled Video');
  readonly type = signal<ProjectType>('youtube-series');
  readonly orientation = signal<VideoOrientation>('landscape');
  readonly customSec = signal(600);
  readonly selectedTemplate = signal<ProjectTemplate | null>(null);

  constructor() {
    void this.templates.load();
  }

  selectType(id: ProjectType) {
    this.type.set(id);
    this.orientation.set(projectTypeInfo(id).defaultOrientation);
  }

  selectTemplate(t: ProjectTemplate) { this.selectedTemplate.set(t); }

  createScratch() {
    const name = this.title().trim() || 'Untitled Video';
    this.io.newProject({
      title: name,
      type: this.type(),
      orientation: this.orientation(),
      limitSecOverride: this.type() === 'others' ? this.customSec() : undefined,
    });
    this.toClose.emit();
  }

  createFromTemplate() {
    const t = this.selectedTemplate();
    if (!t) return;
    this.io.newFromTemplate(t, this.title().trim());
    this.toClose.emit();
  }

  categoryLabel(id: TemplateCategory) { return templateCategoryInfo(id).label; }
  categoryIcon(id: TemplateCategory) { return templateCategoryInfo(id).icon; }

  formatDuration(sec: number): string {
    const m = Math.round(sec / 60);
    if (m < 1) return `${sec}s`;
    if (m >= 60) return `${Math.round(m / 60)}h`;
    return `${m} min`;
  }
}
