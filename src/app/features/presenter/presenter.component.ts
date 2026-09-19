// src/app/features/presenter/presenter.component.ts
import {
  Component, ElementRef, ViewChild, ChangeDetectionStrategy,
  computed, effect, inject, output, signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ProjectStore } from '../../core/services/project/project.store';
import type { SceneBlock } from '../../core/models/scene-block.model';


@Component({
  selector: 'app-presenter',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-50 bg-black text-white flex flex-col"
         (keydown)="onKey($event)" tabindex="0">
      <header class="shrink-0 h-12 px-4 flex items-center gap-4 border-b border-white/10">
        <span class="text-sm font-medium truncate">{{ mode() === 'continuous' ? 'Continuous script' : scene()?.title ?? 'End' }}</span>

        <div class="flex items-center gap-2 text-xs">
          <button class="chip" [class.active]="mode() === 'sequence'" (click)="mode.set('sequence')">Sequence</button>
          <button class="chip" [class.active]="mode() === 'timed'"    (click)="mode.set('timed')">Timed</button>
          <button class="chip" [class.active]="mode() === 'continuous'" (click)="setContinuousMode()">Continuous</button>
        </div>

        <div class="ml-auto flex items-center gap-3 text-xs tabular-nums">
          @if (mode() === 'timed' && scene()) {
            <span [class.text-red-400]="overTime()">
              Scene {{ elapsed() }}s / {{ scene()!.targetDurationSec }}s
            </span>
          }
          <span class="text-zinc-500">Total {{ elapsed() }}s</span>
        </div>

        <button class="chip" (click)="toggleMirror()" [class.active]="mirrored()">Mirror</button>
        <button class="chip" (click)="toClose.emit()">Exit</button>
      </header>

      <!-- min-w-0 is what prevents the horizontal overflow -->
      <div #viewport
           class="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden relative"
           [class.-scale-x-100]="mirrored()">

        <!-- max-w-prose caps the reading column; mx-auto centres it -->
        @if (mode() === 'continuous') {
          <div class="continuous-document mx-auto max-w-prose w-full px-8 py-12"
               [style.font-size.px]="fontSize()">
            @for (item of continuousScenes(); track item.scene.id) {
              @if (item.showBlockHeader && item.block) {
                <div class="block-separator" [style.color]="item.block.color">
                  <span class="block-separator-title">{{ item.block.title }}</span>
                </div>
              }
              <article class="scene-page">
                <div class="scene-page-label">{{ item.scene.title }}</div>
                <div class="presenter-text" [innerHTML]="item.html"></div>
              </article>
            }
          </div>
        } @else {
          <div class="mx-auto max-w-prose w-full px-8 py-[40vh]"
               [style.font-size.px]="fontSize()">
            <div class="presenter-text" [innerHTML]="scriptHtml()"></div>
          </div>
        }

        <!-- Sweet-spot band -->
        <div class="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-accent/40"></div>
      </div>

      <footer class="shrink-0 h-14 px-4 flex items-center gap-4 border-t border-white/10 text-xs">
        <button class="chip" (click)="togglePlay()">{{ playing() ? 'Pause' : 'Play' }}</button>
        <label class="flex items-center gap-2">
          Speed
          <input type="range" min="10" max="220" [ngModel]="wpm()" (ngModelChange)="wpm.set(+$event)" />
          <span class="tabular-nums">{{ wpm() }} wpm</span>
        </label>
        <label class="flex items-center gap-2">
          Font
          <input type="range" min="20" max="72" [ngModel]="fontSize()" (ngModelChange)="fontSize.set(+$event)" />
        </label>
        <div class="ml-auto flex gap-2">
          @if (mode() !== 'continuous') {
            <button class="chip" (click)="prev()">Prev</button>
            <button class="chip" (click)="next()">Next</button>
          }
        </div>
      </footer>
    </div>
  `,
  styles: [`
    @reference "../../../styles.scss";
    :host { display: block; }
    .chip        { @apply px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 transition; }
    .chip.active { @apply bg-accent text-white; }

    /* The actual fix for the hidden-on-the-right bug. */
    .presenter-text {
      overflow-wrap: break-word;  /* break long tokens */
      word-break: normal;         /* keep prose readable */
      line-height: 1.6;
      max-width: 100%;
    }
    /* ::ng-deep pierces view encapsulation so these rules match the
       dynamically-injected [innerHTML] content (tables, images, etc.). */
    .presenter-text ::ng-deep .tableWrapper { overflow-x: auto; margin: 1em 0; }
    .presenter-text ::ng-deep table {
      border-collapse: collapse;
      width: 100%;
      font-size: 0.85em;
    }
    .presenter-text ::ng-deep th,
    .presenter-text ::ng-deep td {
      border: 1px solid rgb(255 255 255 / 0.25);
      padding: 0.4em 0.6em;
      text-align: left;
      vertical-align: top;
    }
    .presenter-text ::ng-deep th { background: rgb(255 255 255 / 0.08); font-weight: 600; }
    .presenter-text ::ng-deep img { max-width: 100%; height: auto; }
    .presenter-text ::ng-deep blockquote {
      border-left: 3px solid rgb(255 255 255 / 0.25);
      padding-left: 1em;
      margin: 0.5em 0;
    }
    .presenter-text ::ng-deep pre {
      white-space: pre-wrap;
      background: rgb(255 255 255 / 0.06);
      padding: 0.75em;
      border-radius: 0.375rem;
    }
    .continuous-document { min-height: 100%; }
    .scene-page {
      min-height: 70vh;
      padding: 3rem 0 5rem;
      border-bottom: 1px solid rgb(255 255 255 / 0.12);
    }
    .scene-page:last-child { border-bottom: 0; }
    .scene-page-label {
      margin-bottom: 1.5rem;
      color: rgb(255 255 255 / 0.45);
      font-size: 0.7em;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .block-separator { @apply flex items-center gap-4 my-8; }
    .block-separator::before,
    .block-separator::after {
      content: '';
      @apply flex-1 h-px;
      background: currentColor;
      opacity: 0.4;
    }
    .block-separator-title {
      @apply shrink-0;
      font-size: 0.7em;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
  `],
})
export class PresenterComponent {
  @ViewChild('viewport') viewportRef?: ElementRef<HTMLElement>;
  readonly toClose = output<void>();

  private store = inject(ProjectStore);
  private sanitizer = inject(DomSanitizer);

  readonly scenes   = this.store.scenes;
  readonly index    = signal(0);
  readonly mode     = signal<'sequence' | 'timed' | 'continuous'>('sequence');
  readonly playing  = signal(false);
  readonly mirrored = signal(false);
  readonly fontSize = signal(38);
  readonly wpm      = signal(145);
  readonly elapsed  = signal(0);
  readonly overTime = signal(false);

  readonly scene = computed(() => this.scenes().at(this.index()) ?? null);
  readonly continuousScenes = computed(() => {
    const blockByScene = new Map<string, SceneBlock>();
    for (const block of this.store.blocks()) {
      for (const id of block.sceneIds) blockByScene.set(id, block);
    }
    const shown = new Set<string>();
    return this.scenes().map(scene => {
      const block = blockByScene.get(scene.id) ?? null;
      const showBlockHeader = !!block && !shown.has(block.id);
      if (block) shown.add(block.id);
      return {
        scene,
        html: this.sanitizer.bypassSecurityTrustHtml(scene.script),
        block,
        showBlockHeader,
      };
    });
  });

  readonly scriptHtml = computed<SafeHtml>(() => {
    const s = this.scene();
    if (!s) return this.sanitizer.bypassSecurityTrustHtml('— End of video —');
    return this.sanitizer.bypassSecurityTrustHtml(s.script);
  });

  setContinuousMode(): void {
    this.mode.set('continuous');
    this.playing.set(false);
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this.ticker) clearInterval(this.ticker);
    this.viewportRef?.nativeElement.scrollTo({ top: 0 });
  }

  private raf?: number;
  private ticker?: ReturnType<typeof setInterval>;
  private lastFrame = 0;

  constructor() {
    effect(() => {
      this.index();
      this.elapsed.set(0);
      this.overTime.set(false);
    });
  }

  togglePlay() {
    this.playing.update(p => !p);
    if (this.playing()) {
      this.lastFrame = performance.now();
      this.loop();
      this.ticker = setInterval(() => {
        this.elapsed.update(e => e + 1);
        const s = this.scene();
        if (this.mode() === 'timed' && s && this.elapsed() >= s.targetDurationSec) {
          this.overTime.set(true);
        }
      }, 1000);
    } else {
      if (this.raf) cancelAnimationFrame(this.raf);
      if (this.ticker) clearInterval(this.ticker);
    }
  }

  private loop = () => {
    if (!this.playing() || !this.viewportRef) return;
    const now = performance.now();
    const dt = (now - this.lastFrame) / 1000;
    this.lastFrame = now;

    const el = this.viewportRef.nativeElement;
    const pxPerSec = this.fontSize() * (this.wpm() / 60) * 0.9;
    el.scrollTop += pxPerSec * dt;

    this.raf = requestAnimationFrame(this.loop);
  };

  next() {
    if (this.mode() === 'continuous') return;
    if (this.index() < this.scenes().length - 1) {
      this.index.update(i => i + 1);
      this.viewportRef?.nativeElement.scrollTo({ top: 0 });
    } else {
      this.toClose.emit();
    }
  }

  prev() {
    if (this.index() > 0) {
      this.index.update(i => i - 1);
      this.viewportRef?.nativeElement.scrollTo({ top: 0 });
    }
  }

  toggleMirror() { this.mirrored.update(m => !m); }

  onKey(e: KeyboardEvent) {
    if (e.key === ' ')           { e.preventDefault(); this.togglePlay(); }
    if (e.key === 'ArrowRight')  this.next();
    if (e.key === 'ArrowLeft')   this.prev();
    if (e.key === 'Escape')      this.toClose.emit();
  }
}