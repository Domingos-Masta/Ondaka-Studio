// src/app/features/scene-list/scene-list.component.ts
import { Component, computed, HostListener, inject } from '@angular/core';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';

import { ROLE_META, Scene } from '../../core/models/project.model';
import { ProjectStore } from '../../core/services/project/project.store';
import { SelectionService } from '../../core/services/selection/selection.service';
import { TimingService } from '../../core/services/timing/timing.service';
import { OrganizeService } from '../../core/services/organize/organize.service';
import { SceneBlock } from '../../core/models/scene-block.model';

@Component({
  selector: 'app-scene-list',
  standalone: true,
  imports: [DragDropModule],
  template: `
    <div class="h-full flex flex-col">
      <div class="px-3 py-2 flex items-center justify-between border-b border-surface-3">
        <span class="text-xs uppercase tracking-wider text-zinc-500">Scenes</span>
        <button class="organize-toggle" [class.active]="organize.active()"
                (click)="organize.toggle()">
          {{ organize.active() ? 'Done' : 'Organize' }}
        </button>
      </div>

      @if (organize.active()) {
        <div class="px-3 py-2 border-b border-surface-3 space-y-1.5">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-zinc-500">{{ organize.selectedCount() }} selected</span>
            <span class="ml-auto flex gap-1">
              <button class="org-btn" [class.disabled]="organize.selectedCount() < 2"
                      title="Group selected scenes into a block"
                      (click)="groupSelected()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 7h7l2 2h9v10H3z"/>
                  <line x1="12" y1="12" x2="12" y2="16"/>
                  <line x1="10" y1="14" x2="14" y2="14"/>
                </svg>
              </button>
              <button class="org-btn" [class.disabled]="!canRemoveFromBlock()"
                      title="Remove selected scenes from their block"
                      (click)="removeSelectedFromBlock()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 7h7l2 2h9v10H3z"/>
                  <line x1="10" y1="14" x2="14" y2="14"/>
                </svg>
              </button>
            </span>
          </div>
          <div class="text-[10px] text-zinc-600">
            Click scenes to select them, then group or remove them from a block.
          </div>
        </div>
      }

      <div cdkDropListGroup class="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5">

        @for (block of store.blocks(); track block.id) {
          <div class="mb-1 select-none" [style.border-left-color]="block.color" style="border-left: 3px solid">
            <div class="flex items-center gap-1 bg-neutral-900 px-2 py-1 text-xs uppercase tracking-wide text-neutral-400">
              <button class="block-move" title="Move block up"
                      [disabled]="store.blocks()[0]?.id === block.id"
                      (click)="moveBlock(block.id, -1)">↑</button>
              <button class="block-move" title="Move block down"
                      [disabled]="store.blocks()[store.blocks().length - 1]?.id === block.id"
                      (click)="moveBlock(block.id, 1)">↓</button>
              <button (click)="store.updateBlock(block.id, { collapsed: !block.collapsed })">
                {{ block.collapsed ? '▸' : '▾' }}
              </button>
              <input class="flex-1 bg-transparent text-neutral-300 outline-none"
                    [value]="block.title"
                    (change)="store.updateBlock(block.id, { title: $any($event.target).value })" />
              <span class="text-neutral-500">{{ block.sceneIds.length }}</span>
              @if (block.sceneIds.length >= 2) {
                <button class="text-accent hover:text-accent-hover"
                        title="Merge these scenes into one"
                        (click)="mergeBlock(block)">⧉</button>
              }
              <button class="text-red-400 hover:text-red-300"
                      (click)="store.removeBlock(block.id)">✕</button>
            </div>

            @if (!block.collapsed) {
              <div cdkDropList
                   (cdkDropListDropped)="onSceneDrop($event, block.id)"
                   class="space-y-1.5 p-1">
                @for (item of store.blockScenesWithTiming(block)(); track item.scene.id) {
                  <div
                    class="scene-card"
                    cdkDrag
                    [cdkDragData]="item.scene.id"
                    (cdkDragEnded)="onDragEnded()"
                    [class.selected]="item.scene.id === selection.selectedId()"
                    [class.organizing]="organize.active()"
                    (click)="onSceneClick(item.scene.id)">

                    @if (organize.active()) {
                      <span class="check" [class.checked]="organize.selectedSet().has(item.scene.id)"></span>
                    }

                    <div class="flex items-center gap-2 mb-1">
                      <span class="w-2 h-2 rounded-full shrink-0"
                            [style.background]="roleColor(item.scene.role)"></span>
                      <span class="text-[10px] uppercase tracking-wider text-zinc-500">
                        {{ roleLabel(item.scene.role) }}
                      </span>
                      <span class="ml-auto flex items-center gap-1.5">
                        <span class="text-[10px] tabular-nums"
                              [class.text-over]="item.timing.deltaSec > 3"
                              [class.text-ok]="Math.abs(item.timing.deltaSec) <= 3">
                          {{ format(item.timing.estimatedSec) }} / {{ format(item.scene.targetDurationSec) }}
                        </span>
                        @if (item.scene.lock !== 'none') {
                          <span class="text-[10px] text-accent" title="Locked">🔒</span>
                        }
                        <button type="button" class="scene-delete" title="Delete scene" aria-label="Delete scene"
                                (click)="$event.stopPropagation(); deleteScene(item.scene.id)">✕</button>
                      </span>
                    </div>

                    <div class="text-sm font-medium truncate">{{ item.scene.title }}</div>
                    <div class="text-xs text-zinc-500 truncate">
                      {{ preview(item.scene.script) || 'Empty script' }}
                    </div>
                  </div>
                } @empty {
                  <div class="text-xs text-zinc-600 text-center py-2">Drop scenes here.</div>
                }
              </div>
            }
          </div>
        }

        <div cdkDropList
             (cdkDropListDropped)="onUngroupedDrop($event)"
             class="space-y-1.5">
          @for (item of store.ungroupedScenes(); track item.scene.id) {
            <div
              class="scene-card"
              cdkDrag
              [cdkDragData]="item.scene.id"
              (cdkDragEnded)="onDragEnded()"
              [class.selected]="item.scene.id === selection.selectedId()"
              [class.organizing]="organize.active()"
              (click)="onSceneClick(item.scene.id)">

              @if (organize.active()) {
                <span class="check" [class.checked]="organize.selectedSet().has(item.scene.id)"></span>
              }

              <div class="flex items-center gap-2 mb-1">
                <span class="w-2 h-2 rounded-full shrink-0"
                      [style.background]="roleColor(item.scene.role)"></span>
                <span class="text-[10px] uppercase tracking-wider text-zinc-500">
                  {{ roleLabel(item.scene.role) }}
                </span>
                <span class="ml-auto flex items-center gap-1.5">
                  <span class="text-[10px] tabular-nums"
                        [class.text-over]="item.timing.deltaSec > 3"
                        [class.text-ok]="Math.abs(item.timing.deltaSec) <= 3">
                    {{ format(item.timing.estimatedSec) }} / {{ format(item.scene.targetDurationSec) }}
                  </span>
                  @if (item.scene.lock !== 'none') {
                    <span class="text-[10px] text-accent" title="Locked">🔒</span>
                  }
                  <button type="button" class="scene-delete" title="Delete scene" aria-label="Delete scene"
                          (click)="$event.stopPropagation(); deleteScene(item.scene.id)">✕</button>
                </span>
              </div>

              <div class="text-sm font-medium truncate">{{ item.scene.title }}</div>
              <div class="text-xs text-zinc-500 truncate">
                {{ preview(item.scene.script) || 'Empty script' }}
              </div>
            </div>
          } @empty {
            <div class="text-xs text-zinc-600 text-center py-2">Drop scenes here.</div>
          }
        </div>
      </div>

      <div class="p-2 border-t border-surface-3 flex gap-1">
        <button class="btn-add flex-1" (click)="addAndSelect('point')">+ Scene</button>
        <button class="btn-add" (click)="addAndSelect('hook')" title="Add hook">H</button>
        <button class="btn-add" (click)="addAndSelect('cta')" title="Add CTA">C</button>
      </div>
    </div>
  `,
  styles: [`
     @reference "../../../styles.scss";
    .scene-card {
      @apply relative px-3 py-2 rounded-md bg-surface-2 border border-transparent
             cursor-pointer transition;
    }
    .scene-card:hover    { @apply border-surface-3; }
    .scene-card.selected { @apply border-accent bg-surface-3; }
    .scene-card.organizing { cursor: pointer; @apply pl-8; }
    .cdk-drag-preview    { @apply shadow-2xl opacity-90 rounded-md bg-surface-3; }
    .cdk-drag-placeholder{ @apply opacity-30; }
    .btn-add { @apply text-xs px-2 py-1.5 rounded text-zinc-300 hover:bg-surface-2 transition; }

    .organize-toggle { @apply text-xs px-2 py-1 rounded text-zinc-300 hover:bg-surface-2 transition; }
    .organize-toggle.active { @apply bg-accent/20 text-accent; }

    .block-move { @apply text-xs px-1.5 py-0.5 rounded text-neutral-400 hover:bg-neutral-800 transition; }
    .block-move:disabled { @apply opacity-30 pointer-events-none; }

    .org-btn { @apply text-[11px] px-2 py-1 rounded bg-surface-2 text-zinc-200 hover:bg-surface-3 transition; }
    .org-btn.disabled { @apply opacity-40 pointer-events-none; }

    .check {
      @apply absolute left-1.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded border
             border-zinc-500 bg-surface-1 flex items-center justify-center;
    }
    .check.checked { @apply border-accent bg-accent; }
    .check.checked::after { content: '✓'; @apply text-[10px] text-white leading-none; }

    .scene-delete {
      @apply w-4 h-4 shrink-0 flex items-center justify-center rounded
             text-zinc-500 opacity-0 transition;
    }
    .scene-delete:hover { @apply text-over bg-surface-3; }
    .scene-card:hover .scene-delete { @apply opacity-100; }
  `],
})
export class SceneListComponent {
  readonly store = inject(ProjectStore);
  readonly selection = inject(SelectionService);
  readonly organize = inject(OrganizeService);
  private timing = inject(TimingService);
  readonly Math = Math;

  readonly canRemoveFromBlock = computed(() => {
    const grouped = new Set(this.store.blocks().flatMap(b => b.sceneIds));
    return this.organize.selectedIds().some(id => grouped.has(id));
  });

  readonly ungroupedScenes = computed(() => {
    const grouped = new Set(this.store.blocks().flatMap(b => b.sceneIds));
    return this.store.scenes().filter(s => !grouped.has(s.id));
  });


  // Keyboard navigation between scenes
  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    const target = e.target as HTMLElement;
    // Don't hijack typing in inputs / the editor
    if (target.matches('input, textarea, [contenteditable="true"]')) return;
    if (e.key === 'ArrowDown' && (e.altKey || e.metaKey)) { e.preventDefault(); this.selection.next(); }
    if (e.key === 'ArrowUp' && (e.altKey || e.metaKey)) { e.preventDefault(); this.selection.prev(); }
  }

  addAndSelect(role: Parameters<ProjectStore['addScene']>[0]) {
    const scene = this.store.addScene(role);
    this.selection.select(scene.id);
  }

  private suppressClick = false;

  onDragEnded(): void {
    // A real drag is followed by a synthetic click — ignore the next one so it
    // doesn't re-select or toggle the scene that was just moved.
    this.suppressClick = true;
  }

  moveBlock(blockId: string, delta: number): void {
    const blocks = this.store.blocks();
    const index = blocks.findIndex(b => b.id === blockId);
    if (index < 0) return;
    const to = index + delta;
    if (to < 0 || to >= blocks.length) return;
    this.store.moveBlock(blockId, to);
  }

  onSceneDrop(event: CdkDragDrop<string>, blockId: string): void {
    const sceneId = event.item.data as string;
    if (!sceneId) return;
    const toIndex = event.currentIndex;
    // Defer the state update so CDK can finish tearing down its drag
    // preview/placeholder before Angular re-renders the moved scene. Doing it
    // synchronously leaves a "frozen" ghost element on screen.
    setTimeout(() => {
      this.store.moveScene(sceneId, blockId, toIndex);
      this.selection.select(sceneId);
    });
  }

  onUngroupedDrop(event: CdkDragDrop<string>): void {
    const sceneId = event.item.data as string;
    if (!sceneId) return;
    const toIndex = event.currentIndex;
    setTimeout(() => {
      this.store.moveScene(sceneId, null, toIndex);
      this.selection.select(sceneId);
    });
  }

  onSceneClick(id: string) {
    if (this.suppressClick) {
      this.suppressClick = false;
      return;
    }
    if (this.organize.active()) {
      this.organize.toggleScene(id);
    } else {
      this.selection.select(id);
    }
  }

  groupSelected() {
    const ids = this.organize.selectedIds();
    if (ids.length < 2) return;
    const block = this.store.createBlock(ids);
    if (block) this.organize.clearSelection();
  }

  removeSelectedFromBlock() {
    const ids = this.organize.selectedIds();
    if (!ids.length) return;
    this.store.removeScenesFromBlocks(ids);
    this.organize.clearSelection();
  }

  mergeBlock(block: SceneBlock) {
    const scene = this.store.mergeScenes(block.sceneIds);
    if (scene) this.selection.select(scene.id);
  }

  deleteScene(id: string) {
    const wasSelected = this.selection.selectedId() === id;
    this.store.removeScene(id);
    if (wasSelected) this.selection.clear();
  }

  roleLabel(r: keyof typeof ROLE_META) { return ROLE_META[r].label; }
  roleColor(r: keyof typeof ROLE_META) { return ROLE_META[r].color; }

  preview(html: string): string {
    return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
  }
  format(sec: number) { return this.timing.formatTime(sec); }

  scenesInBlock(block: SceneBlock) {
    const order = new Map(this.store.scenes().map((s, i) => [s.id, i]));
    return block.sceneIds
      .map(id => this.store.scenes().find(s => s.id === id))
      .filter((s): s is Scene => !!s)
      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }
}