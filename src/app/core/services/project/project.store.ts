// src/app/core/services/project.store.ts
import { Injectable, Injector, computed, inject, signal } from '@angular/core';
import { AiRevision, DEFAULT_PROJECT_TYPE, NewProjectOptions, ProjectType, Scene, Take, toEditorHtml, VideoProject, projectTypeInfo } from '../../models/project.model';
import { ProjectTemplate, templateCategoryInfo } from '../../models/template.model';
import { TimingService } from '../timing/timing.service';
import { BLOCK_PALETTE, SceneBlock } from '../../models/scene-block.model';
import { ToastService } from '../toast/toast.service';
import { GeneratedScene } from '../../models/ai/prompts/script-schema';
import { SelectionService } from '../selection/selection.service';

const uid = () => crypto.randomUUID();

function blankProject(options: NewProjectOptions = {}): VideoProject {
  const type = options.type ?? DEFAULT_PROJECT_TYPE;
  const info = projectTypeInfo(type);
  const limitSec = options.limitSecOverride ?? info.recommendedSec;
  return {
    id: uid(),
    title: options.title ?? 'Untitled Video',
    type,
    orientation: options.orientation ?? info.defaultOrientation,
    limitSecOverride: options.limitSecOverride,
    targetDurationSec: limitSec,
    speakingWpm: 145,
    scenes: [],
    takes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    blocks: [],
  };
}

@Injectable({ providedIn: 'root' })
export class ProjectStore {
  private readonly _project = signal<VideoProject>(blankProject());
  readonly project = this._project.asReadonly();

  readonly scenes = computed(() =>
    [...this._project().scenes]
      .filter(scene => !!scene && typeof scene.id === 'string')
      .sort((a, b) => a.order - b.order)
  );

  readonly totalEstimatedSec = computed(() =>
    this.scenes().reduce((sum, s) =>
      sum + this.timing.estimateDuration(s.script, this._project().speakingWpm, s.pauseSec), 0)
  );

  readonly totalTargetSec = computed(() =>
    this.scenes().reduce((sum, s) => sum + s.targetDurationSec, 0)
  );

  /** Sum of spoken words across every scene's script. */
  readonly totalWordCount = computed(() =>
    this.scenes().reduce((sum, s) => sum + this.timing.countWords(s.script), 0)
  );

  /** Recommended duration limit for the project's type/category (custom override wins). */
  readonly limitSec = computed(() => {
    const p = this._project();
    return p.limitSecOverride ?? projectTypeInfo(p.type).recommendedSec;
  });

  /** Word budget that fits inside the type's recommended duration. */
  readonly limitWordBudget = computed(() =>
    this.timing.wordsForDuration(this.limitSec(), this._project().speakingWpm, 0)
  );

  /** True when the script exceeds the recommended limit for the project type. */
  readonly overLimit = computed(() =>
    this.totalEstimatedSec() > this.limitSec() || this.totalWordCount() > this.limitWordBudget()
  );

  readonly scenesWithTiming = computed(() =>
    this.scenes().map(scene => ({
      scene,
      timing: this.timing.analyze(
        scene.script,
        scene.targetDurationSec,
        this._project().speakingWpm,
        scene.pauseSec,
      ),
    }))
  );

  readonly ungroupedScenes = computed(() => {
    const grouped = new Set(this.blocks().flatMap(b => b.sceneIds));
    const ungrouped = this.scenes().filter(s => !grouped.has(s.id));
    return ungrouped.map(s => ({
      scene: s,
      timing: this.timing.analyze(
        s.script,
        s.targetDurationSec,
        this._project().speakingWpm,
        s.pauseSec,
      ),
    }));
  });

  readonly blockScenesWithTiming = (block: SceneBlock) => computed(() =>
    block.sceneIds.map(id => {
      const scene = this.scenes().find(s => s.id === id);
      if (!scene) return null;
      return {
        scene,
        timing: this.timing.analyze(
          scene.script,
          scene.targetDurationSec,
          this._project().speakingWpm,
          scene.pauseSec,
        ),
      };
    }).filter(Boolean) as { scene: Scene; timing: ReturnType<TimingService['analyze']> }[]
  );

  private injector = inject(Injector);

  private timing = inject(TimingService);
  private toast = inject(ToastService);
  constructor() {
  }

  load(project: VideoProject) {
    this._project.set({
      ...project,
      scenes: project.scenes.map(scene => ({
        ...scene,
        script: toEditorHtml(scene.script),
        notes: String(scene.notes ?? ''),
      })),
      blocks: (project.blocks ?? []).map(block => ({
        ...block,
        notes: String(block.notes ?? ''),
      })),
    });
  }

  newProject(options?: NewProjectOptions) { this._project.set(blankProject(options)); }

  patch(patch: Partial<VideoProject>) {
    this._project.update(p => ({ ...p, ...patch, updatedAt: new Date().toISOString() }));
  }

  updateProjectType(type: ProjectType) {
    this._project.update(p => ({ ...p, type, updatedAt: new Date().toISOString() }));
  }

  createFromTemplate(template: ProjectTemplate, title?: string): void {
    const category = templateCategoryInfo(template.category);
    const scenes: Scene[] = template.scenes.map((ts, i) => ({
      id: uid(),
      order: i,
      title: ts.title,
      role: ts.role,
      script: '',
      targetDurationSec: ts.targetDurationSec,
      pauseSec: 0,
      lock: 'none',
      notes: ts.description,
      assets: [],
      aiRevisions: [],
    }));
    this._project.set({
      id: uid(),
      title: title?.trim() || template.name,
      type: category.projectType,
      orientation: template.orientation,
      targetDurationSec: scenes.reduce((sum, s) => sum + s.targetDurationSec, 0),
      speakingWpm: 145,
      scenes,
      takes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      blocks: [],
    });
  }

  // --- Scene CRUD ---
  addScene(role: Scene['role'] = 'point'): Scene {
    const scenes = this.scenes();
    const scene: Scene = {
      id: uid(),
      order: scenes.length,
      title: `Scene ${scenes.length + 1}`,
      role,
      script: '',
      targetDurationSec: role === 'hook' ? 8 : role === 'intro' ? 20 : 60,
      pauseSec: 0,
      lock: 'none',
      notes: '',
      assets: [],
    };
    this._project.update(p => ({ ...p, scenes: [...p.scenes, scene] }));
    return scene;
  }

  updateScene(id: string, patch: Partial<Scene>) {
    this._project.update(p => ({
      ...p,
      scenes: p.scenes.map(s => (s.id === id ? { ...s, ...patch } : s)),
      updatedAt: new Date().toISOString(),
    }));
  }

  removeScene(id: string) {
    this._project.update(p => ({
      ...p,
      scenes: p.scenes.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i })),
      blocks: (p.blocks ?? [])
        .map(b => ({ ...b, sceneIds: b.sceneIds.filter(sid => sid !== id) }))
        .filter(b => b.sceneIds.length > 0),
      updatedAt: new Date().toISOString(),
    }));
  }

  reorderScenes(previousIndex: number, currentIndex: number) {
    this._project.update(p => {
      const sorted = [...p.scenes].sort((a, b) => a.order - b.order);
      if (previousIndex < 0 || previousIndex >= sorted.length) return p;
      const [moved] = sorted.splice(previousIndex, 1);
      if (!moved) return p;
      sorted.splice(currentIndex, 0, moved);
      return {
        ...p,
        scenes: sorted.map((s, i) => ({ ...s, order: i })),
        updatedAt: new Date().toISOString(),
      };
    });
  }

  reorderScene(sceneId: string, currentIndex: number): void {
    this._project.update(p => {
      const sorted = [...p.scenes].sort((a, b) => a.order - b.order);
      const previousIndex = sorted.findIndex(scene => scene.id === sceneId);
      if (previousIndex < 0) return p;

      const [moved] = sorted.splice(previousIndex, 1);
      if (!moved) return p;
      const targetIndex = Math.max(0, Math.min(currentIndex, sorted.length));
      sorted.splice(targetIndex, 0, moved);
      return {
        ...p,
        scenes: sorted.map((scene, index) => ({ ...scene, order: index })),
        updatedAt: new Date().toISOString(),
      };
    });
  }

  // --- Fitting commands ---
  fitScriptsToTimeline() {
    const wpm = this._project().speakingWpm;
    this._project.update(p => ({
      ...p,
      scenes: p.scenes.map(s => {
        if (s.lock === 'script' || s.lock === 'time') return s;
        // Only recompute the target from the script if the scene is unlocked.
        return {
          ...s,
          targetDurationSec: this.timing.estimateDuration(s.script, wpm, s.pauseSec),
        };
      }),
      updatedAt: new Date().toISOString(),
    }));
  }

  calibrateWpm() {
    const usable = this._project().takes.filter(t => t.wordCount >= 30);
    if (usable.length < 3) return;
    const avg = usable.reduce((s, t) => s + t.achievedWpm, 0) / usable.length;
    this.patch({ speakingWpm: Math.round(avg) });
  }

  addTake(take: Omit<Take, 'id'>) {
    this._project.update(p => ({
      ...p,
      takes: [...p.takes, { ...take, id: uid() }],
      updatedAt: new Date().toISOString(),
    }));
  }

  // --- SceneBlock CRUD ---
  readonly blocks = computed(() => this.project()?.blocks ?? []);

  updateProject(patch: (p: VideoProject) => VideoProject) {
    this._project.update(p => ({ ...patch(p), updatedAt: new Date().toISOString() }));
  }

  createBlock(sceneIds: string[], title?: string): SceneBlock | null {
    const ids = sceneIds.filter(id => this.project()?.scenes.some(s => s.id === id));
    if (ids.length < 2) {
      this.toast.show('Select at least two scenes to group.', 'error');
      return null;
    }
    // Remove any existing membership for these scenes
    const cleanedBlocks = (this.project()?.blocks ?? []).map(b => ({
      ...b,
      sceneIds: b.sceneIds.filter(id => !ids.includes(id)),
    }));

    const block: SceneBlock = {
      id: crypto.randomUUID(),
      title: title ?? `Block ${cleanedBlocks.length + 1}`,
      color: BLOCK_PALETTE[cleanedBlocks.length % BLOCK_PALETTE.length],
      sceneIds: ids,
      collapsed: false,
      notes: '',
    };
    this.updateProject(p => ({ ...p, blocks: [...cleanedBlocks, block] }));
    return block;
  }

  removeBlock(blockId: string): void {
    this.updateProject(p => ({ ...p, blocks: p.blocks.filter(b => b.id !== blockId) }));
  }

  updateBlock(blockId: string, patch: Partial<SceneBlock>): void {
    this.updateProject(p => ({
      ...p,
      blocks: p.blocks.map(b => (b.id === blockId ? { ...b, ...patch } : b)),
    }));
  }

  assignSceneToBlock(sceneId: string, blockId: string | null): void {
    this.updateProject(p => ({
      ...p,
      blocks: p.blocks.map(b => {
        const filtered = b.sceneIds.filter(id => id !== sceneId);
        if (b.id === blockId) return { ...b, sceneIds: [...filtered, sceneId] };
        return { ...b, sceneIds: filtered };
      }),
    }));
    // Optionally remove empty blocks
    const empty = (this.project()?.blocks ?? []).filter(b => b.sceneIds.length === 0);
    for (const b of empty) this.removeBlock(b.id);
  }

  /**
   * Merge multiple scenes into a single scene. Scripts are concatenated
   * (separated by a blank paragraph), durations are summed, and notes/assets
   * are combined. The merged scene replaces the originals at the position of
   * the first one, and any block membership for the merged scenes is removed.
   */
  mergeScenes(sceneIds: string[]): Scene | null {
    const sorted = this.scenes();
    const toMerge = sorted.filter(s => sceneIds.includes(s.id));

    if (toMerge.length < 2) {
      this.toast.show('Select at least two scenes to merge.', 'error');
      return null;
    }

    const first = toMerge[0];
    const script = toMerge
      .map(s => (s.script || '').trim())
      .filter(Boolean)
      .join('<p><br></p>');

    const merged: Scene = {
      ...first,
      id: uid(),
      title: `${first.title} +${toMerge.length - 1}`,
      script,
      targetDurationSec: toMerge.reduce((sum, s) => sum + s.targetDurationSec, 0),
      notes: toMerge.map(s => (s.notes || '').trim()).filter(Boolean).join('\n\n'),
      assets: toMerge.flatMap(s => s.assets),
      aiRevisions: toMerge.flatMap(s => s.aiRevisions ?? []),
    };

    const removeIds = new Set(toMerge.map(s => s.id));
    const remaining = sorted.filter(s => !removeIds.has(s.id));
    const insertIndex = sorted.findIndex(s => s.id === first.id);
    const nextScenes = [
      ...remaining.slice(0, insertIndex),
      merged,
      ...remaining.slice(insertIndex),
    ].map((s, i) => ({ ...s, order: i }));

    const blocks = (this.project()?.blocks ?? [])
      .map(b => ({ ...b, sceneIds: b.sceneIds.filter(id => !removeIds.has(id)) }))
      .filter(b => b.sceneIds.length >= 1);

    this._project.update(p => ({
      ...p,
      scenes: nextScenes,
      blocks,
      updatedAt: new Date().toISOString(),
    }));

    this.toast.show(`Merged ${toMerge.length} scenes into one.`);
    return merged;
  }

  /**
   * Reorder blocks by moving the block with `blockId` to `toIndex`.
   * Scene order is then re-normalised so the flat scenes array always matches
   * the visual order (blocks first, then ungrouped scenes).
   */
  moveBlock(blockId: string, toIndex: number): void {
    this.updateProject(p => {
      const blocks = [...p.blocks];
      const from = blocks.findIndex(b => b.id === blockId);
      if (from < 0) return p;
      const [moved] = blocks.splice(from, 1);
      const to = Math.max(0, Math.min(toIndex, blocks.length));
      blocks.splice(to, 0, moved);
      return this.withNormalizedSceneOrder({ ...p, blocks });
    });
  }

  /**
   * Move a scene into a block (or ungroup it when `targetBlockId` is null),
   * placing it at `toIndex` within that container. Also used to reorder scenes
   * inside a block or inside the ungrouped list.
   */
  moveScene(sceneId: string, targetBlockId: string | null, toIndex: number): void {
    this.updateProject(p => {
      if (!p.scenes.some(s => s.id === sceneId)) return p;

      // Remove the scene from every block, then insert it into the target block.
      let blocks = p.blocks.map(b => ({
        ...b,
        sceneIds: b.sceneIds.filter(id => id !== sceneId),
      }));
      if (targetBlockId) {
        blocks = blocks.map(b => {
          if (b.id !== targetBlockId) return b;
          const ids = [...b.sceneIds];
          ids.splice(Math.max(0, Math.min(toIndex, ids.length)), 0, sceneId);
          return { ...b, sceneIds: ids };
        });
      }
      blocks = blocks.filter(b => b.sceneIds.length > 0);

      // Ungrouped scenes keep their relative order via `order`; if this scene
      // is being ungrouped, splice it into the ungrouped list at `toIndex`.
      const grouped = new Set(blocks.flatMap(b => b.sceneIds));
      const ungroupedIds = p.scenes
        .filter(s => !grouped.has(s.id))
        .sort((a, b) => a.order - b.order)
        .map(s => s.id);

      if (!targetBlockId) {
        const existing = ungroupedIds.indexOf(sceneId);
        if (existing >= 0) ungroupedIds.splice(existing, 1);
        ungroupedIds.splice(Math.max(0, Math.min(toIndex, ungroupedIds.length)), 0, sceneId);
      }

      const relOrder = new Map(ungroupedIds.map((id, i) => [id, i]));
      const relSet = new Set(relOrder.keys());
      const scenes = p.scenes.map(s =>
        relSet.has(s.id) ? { ...s, order: relOrder.get(s.id)! } : s
      );

      return this.withNormalizedSceneOrder({ ...p, blocks, scenes });
    });
  }

  /** Reorder an ungrouped scene within the ungrouped list (drag-and-drop). */
  reorderUngroupedScene(sceneId: string, targetIndex: number): void {
    this.moveScene(sceneId, null, targetIndex);
  }

  /**
   * Recompute every scene's `order` so the flat scenes array matches the visual
   * order rendered by the scene list: blocks in order (their scenes in order),
   * then ungrouped scenes. Keeps selection, keyboard navigation, the timeline
   * strip and the presenter aligned with what the user actually sees.
   */
  private withNormalizedSceneOrder(p: VideoProject): VideoProject {
    const byId = new Map(p.scenes.map(s => [s.id, s]));
    const grouped = new Set(p.blocks.flatMap(b => b.sceneIds));
    const ordered: Scene[] = [];
    for (const block of p.blocks) {
      for (const id of block.sceneIds) {
        const scene = byId.get(id);
        if (scene) ordered.push(scene);
      }
    }
    ordered.push(
      ...p.scenes.filter(s => !grouped.has(s.id)).sort((a, b) => a.order - b.order),
    );
    return { ...p, scenes: ordered.map((s, i) => ({ ...s, order: i })) };
  }

  /** Remove the given scenes from whatever block they belong to, dropping empty blocks. */
  removeScenesFromBlocks(sceneIds: string[]): void {
    const remove = new Set(sceneIds);
    const blocks = (this.project()?.blocks ?? [])
      .map(b => ({ ...b, sceneIds: b.sceneIds.filter(id => !remove.has(id)) }))
      .filter(b => b.sceneIds.length > 0);
    this.updateProject(p => ({ ...p, blocks }));
  }

  /** Call this from your existing reorderScenes after the flat scenes array is updated. */
  private reflowBlocksToSceneOrder(): void {
    const order = new Map(this.project().scenes.map((s, i) => [s.id, i]));
    this.updateProject(p => ({
      ...p,
      blocks: p.blocks.map(b => ({
        ...b,
        sceneIds: [...b.sceneIds].sort((a, z) => (order.get(a) ?? 0) - (order.get(z) ?? 0)),
      })),
    }));
  }

  addAiRevision(sceneId: string, revision: Omit<AiRevision, 'id'>): void {
    const full: AiRevision = { ...revision, id: crypto.randomUUID() };
    this.updateProject(p => ({
      ...p,
      scenes: p.scenes.map(s =>
        s.id === sceneId ? { ...s, aiRevisions: [...(s.aiRevisions ?? []), full] } : s
      ),
    }));
  }

  revertAiRevision(sceneId: string, revisionId: string): void {
    const scene = this.project()?.scenes.find(s => s.id === sceneId);
    const rev = scene?.aiRevisions?.find(r => r.id === revisionId);
    if (!scene || !rev) return;
    const next = scene.script.split(rev.replacement).join(rev.original);
    this.updateScene(sceneId, { script: next });
  }

  insertGeneratedScenes(importedScenes: GeneratedScene[], defaultPause: number): void {
    const base = this.project()?.scenes.length ?? 0;
    const newScenes = importedScenes.map((gs, i) => ({
      id: crypto.randomUUID(),
      order: base + i,
      title: gs.title,
      role: gs.role,
      script: toEditorHtml(gs.script),
      targetDurationSec: gs.estimatedDuration,
      pauseSec: defaultPause,
      lock: 'none' as const,
      notes: toEditorHtml(gs.notes ?? ''),
      assets: [],
      aiRevisions: [],
    }));

    this.updateProject(p => ({ ...p, scenes: [...p.scenes, ...newScenes] }));
    if (newScenes[0]) this.injector.get(SelectionService).select(newScenes[0].id);
  }

  clearScenes(): void {
    this.updateProject(p => ({ ...p, scenes: [], blocks: [] }));
  }
}