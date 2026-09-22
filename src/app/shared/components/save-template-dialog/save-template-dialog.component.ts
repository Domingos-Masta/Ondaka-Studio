import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectStore } from '../../../core/services/project/project.store';
import { TemplatesService } from '../../../core/services/templates/templates.service';
import { ToastService } from '../../../core/services/toast/toast.service';
import { TEMPLATE_CATEGORIES, templateCategoryInfo } from '../../../core/models/template.model';
import type { ProjectTemplate, TemplateCategory } from '../../../core/models/template.model';

@Component({
  selector: 'app-save-template-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" (click)="toClose.emit()">
      <div class="w-[480px] max-w-[92vw] rounded-xl border border-neutral-700 bg-neutral-900 p-5 shadow-2xl"
           (click)="$event.stopPropagation()">
        <h2 class="mb-1 text-lg font-semibold text-neutral-100">Save as Template</h2>
        <p class="mb-4 text-xs text-neutral-500">
          Store the current scene structure (titles, roles and notes) as a reusable template.
        </p>

        <label class="mb-3 block">
          <span class="mb-1 block text-xs uppercase tracking-wide text-neutral-400">Template Name</span>
          <input [(ngModel)]="name"
                 class="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none focus:border-indigo-500" />
        </label>

        <label class="mb-4 block">
          <span class="mb-1 block text-xs uppercase tracking-wide text-neutral-400">Category</span>
          <select [(ngModel)]="category"
                  class="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none">
            @for (c of categories; track c.id) {
              <option [value]="c.id">{{ c.icon }} {{ c.label }}</option>
            }
          </select>
        </label>

        <div class="mb-4 text-xs text-neutral-500">{{ sceneCount() }} scenes will be included.</div>

        <div class="flex items-center justify-end gap-2">
          <button class="rounded-md border border-neutral-700 px-3 py-1.5 text-neutral-300 hover:bg-neutral-800"
                  (click)="toClose.emit()">Cancel</button>
          <button class="rounded-md bg-indigo-600 px-4 py-1.5 font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                  [disabled]="!name().trim()" (click)="save()">Save</button>
        </div>
      </div>
    </div>
  `,
})
export class SaveTemplateDialogComponent {
  @Output() toClose = new EventEmitter<void>();

  private store = inject(ProjectStore);
  private templates = inject(TemplatesService);
  private toast = inject(ToastService);

  readonly categories = TEMPLATE_CATEGORIES;
  readonly name = signal('');
  readonly category = signal<TemplateCategory>('youtube-video');
  readonly sceneCount = computed(() => this.store.scenes().length);

  constructor() {
    this.name.set(this.store.project().title?.trim() || 'My Template');
  }

  save() {
    const scenes = this.store.scenes().map((s) => ({
      title: s.title,
      role: s.role,
      description: (s.notes || '').trim() || `Write the ${s.role} content for this scene.`,
      targetDurationSec: s.targetDurationSec,
    }));
    const info = templateCategoryInfo(this.category());
    const template: ProjectTemplate = {
      id: crypto.randomUUID(),
      name: this.name().trim() || 'Untitled Template',
      category: this.category(),
      orientation: this.store.project().orientation ?? info.orientation,
      scenes,
      builtin: false,
      createdAt: new Date().toISOString(),
    };
    void this.templates.save(template);
    this.toast.success(`Template “${template.name}” saved.`);
    this.toClose.emit();
  }
}
