// src/app/features/scene-list/scene-list.component.ts
import { Component, computed, HostListener, inject } from '@angular/core';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';

import { ROLE_META, Scene } from '../../core/models/project.model';
import { ProjectStore } from '../../core/services/project/project.store';
import { SelectionService } from '../../core/services/selection/selection.service';
import { TimingService } from '../../core/services/timing/timing.service';
import { SceneBlock } from '../../core/models/scene-block.model';

@Component({
  selector: 'app-scene-list',
  standalone: true,
  imports: [DragDropModule],
  template: `
    <div class="h-full flex flex-col">
      <div class="px-3 py-2 text-xs uppercase tracking-wider text-zinc-500 border-b border-surface-3">
        Scenes
      </div>

      <div
        cdkDropList
        (cdkDropListDropped)="drop($event)"
        class="flex-1 overflow-y-auto p-2 space-y-1.5">
        @for (block of store.blocks(); track block.id) {
          <div class="mb-1 select-none" [style.border-left-color]="block.color" style="border-left: 3px solid">
            <div class="flex items-center gap-2 bg-neutral-900 px-2 py-1 text-xs uppercase tracking-wide text-neutral-400">
              <button (click)="store.updateBlock(block.id, { collapsed: !block.collapsed })">
                {{ block.collapsed ? '▸' : '▾' }}
              </button>
              <input class="flex-1 bg-transparent text-neutral-300 outline-none"
                    [value]="block.title"
                    (change)="store.updateBlock(block.id, { title: $any($event.target).value })" />
              <span class="text-neutral-500">{{ block.sceneIds.length }}</span>
              <button class="text-red-400 hover:text-red-300"
                      (click)="store.removeBlock(block.id)">✕</button>
            </div>
            @if (!block.collapsed) {
              @for (item of store.blockScenesWithTiming(block)(); track item.scene.id) {
                <div
                  cdkDrag
                  [cdkDragData]="item.scene.id"
                  class="scene-card"
                  [class.selected]="item.scene.id === selection.selectedId()"
                  (click)="selection.select(item.scene.id)">

                  <div class="flex items-center gap-2 mb-1">
                    <span class="w-2 h-2 rounded-full shrink-0"
                          [style.background]="roleColor(item.scene.role)"></span>
                    <span class="text-[10px] uppercase tracking-wider text-zinc-500">
                      {{ roleLabel(item.scene.role) }}
                    </span>
                    <span class="ml-auto text-[10px] tabular-nums"
                          [class.text-over]="item.timing.deltaSec > 3"
                          [class.text-ok]="Math.abs(item.timing.deltaSec) <= 3">
                      {{ format(item.timing.estimatedSec) }} / {{ format(item.scene.targetDurationSec) }}
                    </span>
                  </div>

                  <div class="text-sm font-medium truncate">{{ item.scene.title }}</div>
                  <div class="text-xs text-zinc-500 truncate">
                    {{ preview(item.scene.script) || 'Empty script' }}
                  </div>

                  @if (item.scene.lock !== 'none') {
                    <div class="absolute top-2 right-2 text-[10px] text-accent">🔒</div>
                  }
                </div>
              } @empty {
                <div class="text-xs text-zinc-600 text-center py-8">No scenes yet.</div>
              }
            }
          </div>
        }
        @for (item of store.ungroupedScenes(); track item.scene.id) {
           <div
            cdkDrag
            [cdkDragData]="item.scene.id"
            class="scene-card"
            [class.selected]="item.scene.id === selection.selectedId()"
            (click)="selection.select(item.scene.id)">

            <div class="flex items-center gap-2 mb-1">
              <span class="w-2 h-2 rounded-full shrink-0"
                    [style.background]="roleColor(item.scene.role)"></span>
              <span class="text-[10px] uppercase tracking-wider text-zinc-500">
                {{ roleLabel(item.scene.role) }}
              </span>
              <span class="ml-auto text-[10px] tabular-nums"
                    [class.text-over]="item.timing.deltaSec > 3"
                    [class.text-ok]="Math.abs(item.timing.deltaSec) <= 3">
                {{ format(item.timing.estimatedSec) }} / {{ format(item.scene.targetDurationSec) }}
              </span>
            </div>

            <div class="text-sm font-medium truncate">{{ item.scene.title }}</div>
            <div class="text-xs text-zinc-500 truncate">
              {{ preview(item.scene.script) || 'Empty script' }}
            </div>

            @if (item.scene.lock !== 'none') {
              <div class="absolute top-2 right-2 text-[10px] text-accent">🔒</div>
            }
          </div>
        }
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
    .cdk-drag-preview    { @apply shadow-2xl opacity-90 rounded-md bg-surface-3; }
    .cdk-drag-placeholder{ @apply opacity-30; }
    .btn-add { @apply text-xs px-2 py-1.5 rounded text-zinc-300 hover:bg-surface-2 transition; }
  `],
})
export class SceneListComponent {
  readonly store = inject(ProjectStore);
  readonly selection = inject(SelectionService);
  private timing = inject(TimingService);
  readonly Math = Math;
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

  drop(event: CdkDragDrop<unknown>) {
    const sceneId = event.item.data as string | undefined;
    if (!sceneId) return;
    this.store.reorderScene(sceneId, event.currentIndex);
    this.selection.select(sceneId);
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