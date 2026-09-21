// src/app/features/script-editor/script-editor.component.ts
import {
  Component, ChangeDetectionStrategy, computed, effect, inject, signal,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  DomternalEditorComponent,
  DomternalToolbarComponent,
  DomternalBubbleMenuComponent,
} from '@domternal/angular';
import {
  ClearFormatting,
  FontFamily,
  FontSize,
  Highlight,
  InvisibleChars,
  LineHeight,
  Placeholder,
  StarterKit,
  Subscript,
  Superscript,
  TextAlign,
  TextColor,
  TextStyle,
} from '@domternal/core';
import type { Editor } from '@domternal/core';
import { Table, TableCell, TableHeader, TableRow } from './extensions/table';
import { Image } from './extensions/image';
import { Details, DetailsContent, DetailsSummary } from './extensions/details';

import type { Scene } from '../../core/models/project.model';
import type { SceneBlock } from '../../core/models/scene-block.model';
import { ProjectStore } from '../../core/services/project/project.store';
import { SelectionService } from '../../core/services/selection/selection.service';
import { TimingService } from '../../core/services/timing/timing.service';
import { EditorSelection, getEditorSelection, replaceEditorSelection } from '../../editor/selection.util';
import { AiService } from '../../core/models/ai/adapters/ai.service';
import { SettingsService } from '../../core/services/settings/settings.service';
import { SelectionAction } from '../../shared/components';
import { ToastService } from '../../core/services/toast/toast.service';
import { renderTemplate } from '../../core/models/ai/adapters/prompt-builder';

@Component({
  selector: 'app-script-editor',
  standalone: true,
  imports: [
    FormsModule,
    DomternalEditorComponent,
    DomternalToolbarComponent,
    DomternalBubbleMenuComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (scene(); as s) {
      <div class="h-full flex flex-col min-h-0">

        <!-- Scene header -->
        <div class="shrink-0 px-5 py-3 border-b border-surface-3 flex items-center gap-3">
          <input class="flex-1 min-w-0 bg-transparent text-lg font-semibold outline-none"
                 [ngModel]="s.title"
                 (ngModelChange)="patch({ title: $event })"
                 placeholder="Scene title" />

          <select class="shrink-0 bg-surface-2 text-xs px-2 py-1 rounded outline-none"
                  [ngModel]="s.role"
                  (ngModelChange)="patch({ role: $event })">
            @for (r of roles; track r) { <option [value]="r">{{ r }}</option> }
          </select>

          <button class="btn-icon shrink-0" (click)="toggleLock()"
                  [class.active]="s.lock !== 'none'" [title]="lockTitle(s)">
            {{ s.lock === 'none' ? '🔓' : '🔒' }}
          </button>
        </div>

        <div class="shrink-0 border-b border-surface-3 px-5 py-2">
          <button class="view-toggle" [class.active]="continuousView()" (click)="continuousView.set(!continuousView())">
            {{ continuousView() ? 'Scene editor' : 'Continuous view' }}
          </button>
        </div>

        @if (!continuousView() && editor(); as ed) {
          <domternal-toolbar [editor]="ed" class="shrink-0 border-b border-surface-3" />
          <domternal-bubble-menu [editor]="ed" />
        }

        <!-- Editor: fills remaining space, scrolls internally -->
        <div class="flex-1 min-h-0 overflow-hidden">
          @if (continuousView()) {
            <div #continuousViewport class="continuous-editor">
              @for (item of continuousScenes(); track item.id) {
                @if (item.showBlockHeader && item.block) {
                  <div class="block-separator" [style.color]="item.block.color">
                    <span class="block-separator-title">{{ item.block.title }}</span>
                  </div>
                }
                <article class="editor-page" [attr.data-scene-id]="item.id"
                         (click)="selection.select(item.id)">
                  <div class="editor-page-title">{{ item.title }}</div>
                  <div class="editor-page-content" contenteditable="true" spellcheck="true"
                       [innerHTML]="item.script"
                       (blur)="updateContinuousScene(item.id, $event)"></div>
                </article>
              }
            </div>
          } @else {
          <domternal-editor #editorHost class="relative" (mouseup)="onMouseUpInEditor()" (keyup)="onMouseUpInEditor()"
            class="block w-full h-full"
            [extensions]="extensions"
            [content]="s.script"
            outputFormat="html"
            [attr.data-scene-id]="s.id"
            (editorCreated)="onEditorCreated($any($event))"
            (contentUpdated)="onContentUpdated($any($event).editor.getHTML())">
          </domternal-editor>
          }
          @if (menuAnchor(); as anchor) {
            <app-selection-menu
              [x]="anchor.x"
              [y]="anchor.y"
              (action)="onSelectionAction($any($event))"
              (dismiss)="dismissMenu()"
            />
          }
        </div>

        <!-- Timing bar -->
        <div class="shrink-0 px-5 py-3 border-t border-surface-3">
          <div class="flex items-center gap-4 text-xs mb-1.5">
            <span class="tabular-nums">
              <span class="text-zinc-500">Words</span>
              <span class="ml-1 text-zinc-200">{{ timing().wordCount }}</span>
              <span class="text-zinc-500">/ {{ timing().wordBudget }}</span>
            </span>
            <span class="tabular-nums">
              <span class="text-zinc-500">Est</span>
              <span class="ml-1 text-zinc-200">{{ format(timing().estimatedSec) }}</span>
              <span class="text-zinc-500">/ {{ format(s.targetDurationSec) }}</span>
            </span>
            <span class="ml-auto tabular-nums" [class]="deltaClass()">{{ deltaLabel() }}</span>
          </div>

          <div class="h-1.5 rounded-full bg-surface-2 overflow-hidden">
            <div class="h-full transition-all duration-200"
                 [class.bg-ok]="Math.abs(timing().deltaSec) <= 3"
                 [class.bg-warn]="timing().deltaSec < -3"
                 [class.bg-over]="timing().deltaSec > 3"
                 [style.width.%]="progress()"></div>
          </div>
        </div>
      </div>
    } @else {
      <div class="h-full flex items-center justify-center text-zinc-600 text-sm">
        Select or create a scene to start writing.
      </div>
    }
  `,
  styles: [`
    @reference "../../../styles.scss";
    .btn-icon        { @apply text-xs px-2 py-1 rounded hover:bg-surface-2 transition; }
    .btn-icon.active { @apply bg-accent/20 text-accent; }
    .view-toggle { @apply rounded px-3 py-1.5 text-xs text-zinc-300 hover:bg-surface-2 transition; }
    .view-toggle.active { @apply bg-accent/20 text-accent; }
    .continuous-editor { @apply h-full overflow-y-auto px-8 py-6; }
    .editor-page { @apply mx-auto max-w-3xl min-h-[70vh] border-b border-surface-3 py-8; }
    .editor-page-title { @apply mb-5 text-xs font-semibold uppercase tracking-widest text-zinc-500; }
    .editor-page-content { @apply min-h-[55vh] outline-none; }

    /* Tables rendered via [innerHTML] in the continuous view. */
    .editor-page-content ::ng-deep .tableWrapper { overflow-x: auto; margin: 1em 0; }
    .editor-page-content ::ng-deep table {
      border-collapse: collapse;
      width: 100%;
      font-size: 0.9em;
    }
    .editor-page-content ::ng-deep th,
    .editor-page-content ::ng-deep td {
      border: 1px solid #3a3a3a;
      padding: 0.4em 0.6em;
      text-align: left;
      vertical-align: top;
    }
    .editor-page-content ::ng-deep th { background: #2a2a2a; font-weight: 600; }

    .block-separator { @apply mx-auto max-w-3xl flex items-center gap-3 my-6; }
    .block-separator::before,
    .block-separator::after {
      content: '';
      @apply flex-1 h-px;
      background: currentColor;
      opacity: 0.35;
    }
    .block-separator-title { @apply text-[11px] font-semibold uppercase tracking-widest shrink-0; }

    /* Editor host fills its flex parent completely. */
    :host { display: block; min-height: 0; }
    :host dm-editor { display: block; width: 100%; height: 100%; min-height: 0; }
  `],
})
export class ScriptEditorComponent {

  readonly store = inject(ProjectStore);
  readonly selection = inject(SelectionService);
  private timingSvc = inject(TimingService);
  readonly Math = Math;
  readonly roles: Scene['role'][] =
    ['hook', 'intro', 'setup', 'point', 'demo', 'transition', 'cta', 'outro'];

  readonly editor = signal<Editor | null>(null);
  readonly continuousView = signal(false);
  private readonly editorSceneId = signal<string | null>(null);

  readonly extensions = [
    StarterKit,
    Placeholder.configure({ placeholder: 'Write your script here…' }),
    Highlight,
    Subscript,
    Superscript,
    TextAlign,
    TextColor,
    TextStyle,
    FontSize,
    FontFamily,
    LineHeight,
    InvisibleChars,
    ClearFormatting,
    Table,
    TableRow,
    TableHeader,
    TableCell,
    Details,
    DetailsSummary,
    DetailsContent,
    Image,
  ];

  readonly scene = this.selection.selected;
  readonly continuousScenes = computed(() => {
    const blockByScene = new Map<string, SceneBlock>();
    for (const block of this.store.blocks()) {
      for (const id of block.sceneIds) blockByScene.set(id, block);
    }
    const shown = new Set<string>();
    return this.store.scenes().map(scene => {
      const block = blockByScene.get(scene.id) ?? null;
      const showBlockHeader = !!block && !shown.has(block.id);
      if (block) shown.add(block.id);
      return {
        id: scene.id,
        title: scene.title,
        script: scene.script,
        block,
        showBlockHeader,
      };
    });
  });

  private readonly syncEditorScene = effect(() => {
    const scene = this.scene();
    const editor = this.editor();
    if (!scene || !editor) {
      this.editorSceneId.set(null);
      return;
    }

    this.editorSceneId.set(scene.id);
    if (editor.getHTML() !== scene.script) {
      editor.commands.setContent(scene.script || '', { emitUpdate: false });
    }
  });

  readonly timing = computed(() => {
    const s = this.scene();
    if (!s) return { wordCount: 0, estimatedSec: 0, wordBudget: 0, deltaSec: 0, deltaWords: 0 };
    const p = this.store.project();
    return this.timingSvc.analyze(s.script, s.targetDurationSec, p.speakingWpm, s.pauseSec);
  });

  // --- Editor event handlers and new features helpers ---
  readonly textSelection = signal<EditorSelection | null>(null);
  readonly menuAnchor = signal<{ x: number; y: number } | null>(null);
  readonly aiBusy = signal(false);

  private ai = inject(AiService);
  private settings = inject(SettingsService);
  @ViewChild('editorHost', { read: ElementRef }) editorHost!: ElementRef<HTMLElement>;
  @ViewChild('continuousViewport', { read: ElementRef }) continuousViewport?: ElementRef<HTMLElement>;

  private readonly scrollToSelectedContinuousScene = effect(() => {
    const selectedId = this.selection.selectedId();
    if (!this.continuousView() || !selectedId) return;
    requestAnimationFrame(() => {
      const page = this.continuousViewport?.nativeElement.querySelector<HTMLElement>(
        `[data-scene-id="${CSS.escape(selectedId)}"]`
      );
      page?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
  /** Domternal component ref — adapt to how your template instantiates it. */
  private get editorView(): any {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return (this as any).editor?.view ?? null;
  }
  // --- End of Editor event handlers and new features helpers ---

  private toast = inject(ToastService);
  constructor() {
  }


  onEditorCreated(editor: Editor) { this.editor.set(editor); }

  onContentUpdated(html: string) {
    const s = this.scene();
    if (s && this.editorSceneId() === s.id && s.script !== html) {
      this.store.updateScene(s.id, { script: html });
    }
  }

  patch(patch: Partial<Scene>) {
    const s = this.scene();
    if (s) this.store.updateScene(s.id, patch);
  }

  updateContinuousScene(id: string, event: Event): void {
    const content = event.target as HTMLElement;
    this.store.updateScene(id, { script: content.innerHTML });
  }

  toggleLock() {
    const s = this.scene();
    if (!s) return;
    const next = s.lock === 'none' ? 'script' : s.lock === 'script' ? 'time' : 'none';
    this.patch({ lock: next });
  }

  lockTitle(s: Scene) {
    return s.lock === 'none' ? 'Unlocked — click to lock script'
      : s.lock === 'script' ? 'Script locked — click to lock time'
        : 'Time locked — click to unlock';
  }

  deltaLabel() {
    const d = this.timing().deltaSec;
    if (Math.abs(d) <= 3) return '✓ on time';
    return d > 0 ? `+${d}s over` : `${d}s short`;
  }

  deltaClass() {
    const d = this.timing().deltaSec;
    if (Math.abs(d) <= 3) return 'text-ok';
    return d > 0 ? 'text-over' : 'text-warn';
  }

  progress() {
    const s = this.scene();
    if (!s) return 0;
    return Math.min(100, (this.timing().estimatedSec / Math.max(1, s.targetDurationSec)) * 100);
  }

  format(sec: number) { return this.timingSvc.formatTime(sec); }

  // Additional methods for AI features, selection handling, etc., can be added here.
  onMouseUpInEditor(): void {
    const view = this.editorView;
    const sel = getEditorSelection(view);
    this.textSelection.set(sel);
    if (!sel) { this.menuAnchor.set(null); return; }
    const root = this.editorHost.nativeElement;
    const domSel = window.getSelection();
    if (!domSel || domSel.rangeCount === 0) return;
    const range = domSel.getRangeAt(0).cloneRange();
    const rects = range.getClientRects();
    const rect = rects.length ? rects[rects.length - 1] : range.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    this.menuAnchor.set({
      x: rect.left - rootRect.left + rect.width / 2 - 90,
      y: rect.bottom - rootRect.top + 8,
    });
  }

  dismissMenu(): void {
    this.menuAnchor.set(null);
    this.textSelection.set(null);
  }

  async onSelectionAction(action: SelectionAction): Promise<void> {
    const sel = this.textSelection();
    this.menuAnchor.set(null);
    if (!sel) return;

    const provider = this.settings.activeProvider();
    if (!provider) {
      this.toast.show('Configure an AI provider in Settings first.', 'error');
      return;
    }

    let userPrompt: string;
    const settings = this.settings.settings();

    switch (action) {
      case 'improve':
        userPrompt = renderTemplate(settings.prompts.selectedText, { selection: sel.text });
        break;
      case 'rewrite':
        userPrompt = `Rewrite the following passage with clearer structure and tighter sentences. Same meaning. Return only the rewritten text.\n\n${sel.text}`;
        break;
      case 'expand':
        userPrompt = `Expand the following passage with concrete detail and examples. Keep the same voice. Return only the expanded text.\n\n${sel.text}`;
        break;
      case 'shorten':
        userPrompt = `Condense the following passage to about 60% of its length while preserving the meaning. Return only the condensed text.\n\n${sel.text}`;
        break;
      case 'custom': {
        const instruction = window.prompt('What should the AI do with the selected text?');
        if (!instruction) return;
        userPrompt = `${instruction}\n\n---\n${sel.text}\n---`;
        break;
      }
    }

    this.aiBusy.set(true);
    try {
      const res = await this.ai.complete({
        messages: [
          { role: 'system', content: settings.prompts.systemBase },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
      });

      const replacement = res.text.trim();
      const view = this.editorView;
      if (!view) {
        this.toast.show('Editor not ready.', 'error');
        return;
      }

      replaceEditorSelection(view, replacement);

      this.store.addAiRevision(this.scene()?.id as string, {
        action,
        original: sel.text,
        replacement,
        providerId: provider.id,
        timestamp: new Date().toISOString(),
      });


      this.toast.show('Selection updated.');
    } catch (err) {
      this.toast.show((err as Error).message, 'error');
    } finally {
      this.aiBusy.set(false);
      this.textSelection.set(null);
    }
  }
}