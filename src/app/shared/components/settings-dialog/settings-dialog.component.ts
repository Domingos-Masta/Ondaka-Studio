import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiService } from '../../../core/models/ai/adapters/ai.service';
import { AiProviderType, AiProviderConfig, AppSettings } from '../../../core/models/app-settings.model';
import { SettingsService } from '../../../core/services/settings/settings.service';
import { ToastService } from '../../../core/services/toast/toast.service';

const PRESETS: Record<AiProviderType, { baseUrl: string; model: string }> = {
  openai:    { baseUrl: 'https://api.openai.com/v1',       model: 'gpt-5.5' },
  gemini:    { baseUrl: 'https://generativelanguage.googleapis.com', model: 'gemini-3.5-flash' },
  deepseek:  { baseUrl: 'https://api.deepseek.com',        model: 'deepseek-v4-pro' },
  anthropic: { baseUrl: 'https://api.anthropic.com',       model: 'claude-sonnet-5' },
  custom:    { baseUrl: '',                                model: '' },
};

@Component({
  selector: 'app-settings-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" (click)="toClose.emit()">
      <div class="flex h-[80vh] w-[900px] max-w-[95vw] flex-col rounded-xl border border-neutral-700 bg-neutral-900 shadow-2xl"
           (click)="$event.stopPropagation()">
        <div class="flex items-center justify-between border-b border-neutral-800 p-4">
          <h2 class="text-lg font-semibold text-neutral-100">Settings</h2>
          <button class="text-neutral-400 hover:text-neutral-100" (click)="toClose.emit()">✕</button>
        </div>

        <div class="flex flex-1 overflow-hidden">
          <nav class="w-48 border-r border-neutral-800 bg-neutral-950 p-2 text-sm">
            @for (tab of tabs; track tab.id) {
              <button class="mb-1 block w-full rounded px-3 py-1.5 text-left"
                      [class.bg-neutral-800]="active() === tab.id"
                      [class.text-white]="active() === tab.id"
                      [class.text-neutral-400]="active() !== tab.id"
                      (click)="active.set(tab.id)">{{ tab.label }}</button>
            }
          </nav>

          <div class="flex-1 overflow-auto p-5 text-sm text-neutral-200">
            @switch (active()) {
              @case ('providers') { <ng-container *ngTemplateOutlet="providersTpl" /> }
              @case ('prompts')   { <ng-container *ngTemplateOutlet="promptsTpl" /> }
              @case ('editor')    { <ng-container *ngTemplateOutlet="editorTpl" /> }
              @case ('presenter') { <ng-container *ngTemplateOutlet="presenterTpl" /> }
              @case ('timing')    { <ng-container *ngTemplateOutlet="timingTpl" /> }
            }
          </div>
        </div>
      </div>
    </div>

    <ng-template #providersTpl>
      <div class="mb-4 flex items-center justify-between">
        <h3 class="font-medium">AI Providers</h3>
        <button class="rounded-md bg-indigo-600 px-3 py-1.5 text-xs text-white hover:bg-indigo-500"
                (click)="addProvider()">+ Add Provider</button>
      </div>
      @for (p of settings.settings().providers; track p.id) {
        <div class="mb-3 rounded-lg border border-neutral-800 bg-neutral-950 p-3">
          <div class="mb-2 flex items-center gap-2">
            <input [(ngModel)]="p.name" (ngModelChange)="saveProvider(p)"
                   class="flex-1 rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100" />
            <label class="flex items-center gap-1 text-xs text-neutral-400">
              <input type="radio" name="defaultProvider" [checked]="settings.settings().defaultProviderId === p.id"
                     (change)="setDefault(p.id)" /> Default
            </label>
            <label class="flex items-center gap-1 text-xs text-neutral-400">
              <input type="checkbox" [(ngModel)]="p.enabled" (ngModelChange)="saveProvider(p)" /> Enabled
            </label>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <label class="block">
              <span class="text-xs text-neutral-500">Type</span>
              <select [(ngModel)]="p.type" (ngModelChange)="applyPreset(p)"
                      class="w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100">
                @for (t of providerTypes; track t) { <option [value]="t">{{ t }}</option> }
              </select>
            </label>
            <label class="block">
              <span class="text-xs text-neutral-500">Model</span>
              <input [(ngModel)]="p.model" (ngModelChange)="saveProvider(p)"
                     class="w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100" />
            </label>
            <label class="col-span-2 block">
              <span class="text-xs text-neutral-500">Base URL</span>
              <input [(ngModel)]="p.baseUrl" (ngModelChange)="saveProvider(p)"
                     class="w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100" />
            </label>
            <label class="col-span-2 block">
              <span class="text-xs text-neutral-500">API Key</span>
              <input type="password" [(ngModel)]="p.apiKey" (ngModelChange)="saveProvider(p)"
                     class="w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 font-mono text-neutral-100" />
            </label>
          </div>
          <div class="mt-2 flex items-center gap-2">
            <button class="rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
                    [disabled]="testingId() === p.id" (click)="test(p)">
              {{ testingId() === p.id ? 'Testing…' : 'Test Connection' }}
            </button>
            <button class="ml-auto text-xs text-red-400 hover:text-red-300" (click)="remove(p.id)">Delete</button>
          </div>
        </div>
      } @empty {
        <div class="text-neutral-500">No providers configured. Add one to enable AI features.</div>
      }
    </ng-template>

    <ng-template #promptsTpl>
      <h3 class="mb-3 font-medium">Prompts</h3>
      @for (key of promptKeys; track key) {
        <label class="mb-3 block">
          <span class="text-xs text-neutral-500">{{ key }}</span>
          <textarea rows="4" [(ngModel)]="settings.settings().prompts[key]"
                    (ngModelChange)="savePrompts()"
                    class="w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-1 font-mono text-xs text-neutral-100"></textarea>
        </label>
      }
    </ng-template>

    <ng-template #editorTpl>
      <h3 class="mb-3 font-medium">Editor</h3>
      <label class="mb-3 block">Font size ({{ settings.settings().editor.fontSize }}px)
        <input type="range" min="12" max="28" [(ngModel)]="settings.settings().editor.fontSize"
               (ngModelChange)="saveEditor()" class="w-full" />
      </label>
      <label class="mb-3 block">Line width ({{ settings.settings().editor.lineWidth }}ch)
        <input type="range" min="40" max="120" [(ngModel)]="settings.settings().editor.lineWidth"
               (ngModelChange)="saveEditor()" class="w-full" />
      </label>
      <label class="block">Font family
        <input [(ngModel)]="settings.settings().editor.fontFamily" (ngModelChange)="saveEditor()"
               class="w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100" />
      </label>
    </ng-template>

    <ng-template #presenterTpl>
      <h3 class="mb-3 font-medium">Presenter</h3>
      <label class="mb-3 block">Default font size
        <input type="number" [(ngModel)]="settings.settings().presenter.fontSize"
               (ngModelChange)="savePresenter()"
               class="w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100" />
      </label>
      <label class="mb-3 flex items-center gap-2">
        <input type="checkbox" [(ngModel)]="settings.settings().presenter.mirror" (ngModelChange)="savePresenter()" />
        Mirror by default
      </label>
    </ng-template>

    <ng-template #timingTpl>
      <h3 class="mb-3 font-medium">Timing</h3>
      <label class="mb-3 block">Default WPM
        <input type="number" [(ngModel)]="settings.settings().timing.defaultWpm"
               (ngModelChange)="saveTiming()"
               class="w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100" />
      </label>
      <label class="mb-3 block">Default scene pause (s)
        <input type="number" step="0.1" [(ngModel)]="settings.settings().timing.defaultScenePause"
               (ngModelChange)="saveTiming()"
               class="w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100" />
      </label>
      <label class="mb-3 flex items-center gap-2">
        <input type="checkbox" [(ngModel)]="settings.settings().autosave.enabled" (ngModelChange)="saveAutosave()" />
        Autosave enabled
      </label>
      <label class="block">Autosave debounce (ms)
        <input type="number" [(ngModel)]="settings.settings().autosave.debounceMs"
               (ngModelChange)="saveAutosave()"
               class="w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100" />
      </label>
    </ng-template>
  `,
})
export class SettingsDialogComponent {
  @Output() toClose = new EventEmitter<void>();

  readonly settings = inject(SettingsService);
  private ai = inject(AiService);
  private toast = inject(ToastService);

  readonly active = signal<'providers' | 'prompts' | 'editor' | 'presenter' | 'timing'>('providers');
  readonly testingId = signal<string | null>(null);

  readonly tabs = [
    { id: 'providers' as const, label: 'AI Providers' },
    { id: 'prompts' as const, label: 'Prompts' },
    { id: 'editor' as const, label: 'Editor' },
    { id: 'presenter' as const, label: 'Presenter' },
    { id: 'timing' as const, label: 'Timing' },
  ];

  readonly providerTypes: AiProviderType[] = ['openai', 'gemini', 'deepseek', 'anthropic', 'custom'];
  readonly promptKeys: (keyof AppSettings['prompts'])[] =
    ['systemBase', 'selectedText', 'titleToScript', 'importAdapt'];

  async addProvider(): Promise<void> {
    const preset = PRESETS.openai;
    const created = await this.settings.addProvider({
      name: 'OpenAI',
      type: 'openai',
      baseUrl: preset.baseUrl,
      model: preset.model,
      apiKey: '',
      enabled: true,
    });
    if (!this.settings.settings().defaultProviderId) {
      await this.settings.patch({ defaultProviderId: created.id });
    }
  }

  async saveProvider(p: AiProviderConfig): Promise<void> {
    await this.settings.updateProvider(p.id, p);
  }

  async setDefault(id: string): Promise<void> {
    await this.settings.patch({ defaultProviderId: id });
  }

  async remove(id: string): Promise<void> {
    if (!confirm('Delete this provider?')) return;
    await this.settings.removeProvider(id);
  }

  async applyPreset(p: AiProviderConfig): Promise<void> {
    const preset = PRESETS[p.type];
    p.baseUrl = preset.baseUrl;
    if (!p.model) p.model = preset.model;
    if (!p.name) p.name = p.type;
    await this.saveProvider(p);
  }

  async test(p: AiProviderConfig): Promise<void> {
    this.testingId.set(p.id);
    try {
      await this.ai.test(p);
      this.toast.show(`${p.name} connection succeeded.`, 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.toast.show(`${p.name} connection failed: ${message}`, 'error', 7000);
    } finally {
      this.testingId.set(null);
    }
  }

  async savePrompts(): Promise<void> { await this.settings.patch({ prompts: this.settings.settings().prompts }); }
  async saveEditor(): Promise<void> { await this.settings.patch({ editor: this.settings.settings().editor }); }
  async savePresenter(): Promise<void> { await this.settings.patch({ presenter: this.settings.settings().presenter }); }
  async saveTiming(): Promise<void> { await this.settings.patch({ timing: this.settings.settings().timing }); }
  async saveAutosave(): Promise<void> { await this.settings.patch({ autosave: this.settings.settings().autosave }); }
}