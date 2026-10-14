// src/app/core/services/tabs/tabs.service.ts
import { Injectable, computed, inject, signal } from '@angular/core';
import { DocumentTab } from '../../models/document.model';
import { NewProjectOptions, VideoProject } from '../../models/project.model';
import { blankProject, ProjectStore } from '../project/project.store';
import { SelectionService } from '../selection/selection.service';
import { OrganizeService } from '../organize/organize.service';

const uid = () => crypto.randomUUID();

/**
 * Owns the set of open scripts and the mapping between a tab and the single
 * live workspace (ProjectStore / SelectionService / OrganizeService).
 *
 * Switching tabs captures the live state into the outgoing tab and loads the
 * incoming tab's project into the store, so every tab behaves like a complete,
 * independent workspace: its own scenes, editor content, file path, dirty flag
 * and selection.
 */
@Injectable({ providedIn: 'root' })
export class TabsService {
  private readonly store = inject(ProjectStore);
  private readonly selection = inject(SelectionService);
  private readonly organize = inject(OrganizeService);

  private readonly _tabs = signal<DocumentTab[]>([]);
  private readonly _activeId = signal<string | null>(null);

  readonly tabs = this._tabs.asReadonly();
  readonly activeId = this._activeId.asReadonly();
  readonly count = computed(() => this._tabs().length);
  readonly active = computed(() => this._tabs().find(t => t.id === this._activeId()) ?? null);
  readonly activeIsDirty = computed(() => this.isDirty(this.active()));

  constructor() {
    const tab = this.toRecord(this.store.project(), null, null);
    this._tabs.set([tab]);
    this._activeId.set(tab.id);
  }

  /** Dirty state of a tab — the active one is compared against the live project. */
  isDirty(tab: DocumentTab | null): boolean {
    if (!tab) return false;
    if (tab.id !== this._activeId()) return tab.isDirty;
    return this.store.project().updatedAt !== tab.savedRevision;
  }

  /** Label shown on the tab. */
  label(tab: DocumentTab): string {
    const title = (tab.title || tab.project?.title || '').trim();
    if (title) return title;
    return tab.filePath ? tab.filePath.split(/[\\/]/).pop() ?? 'Untitled' : 'Untitled';
  }

  /** Open a project in a tab, replacing the active tab when it is still untouched. */
  openDocument(project: VideoProject, filePath: string | null, reuseIfPristine = true): DocumentTab {
    return this.applyDocument(project, filePath, reuseIfPristine);
  }

  /** Create a new empty project in its own tab, reusing the active tab when it is untouched. */
  newDocument(options?: NewProjectOptions): DocumentTab {
    return this.applyDocument(blankProject(options), null, true);
  }

  /** Add a fresh empty workspace tab — always creates one, like the "+" affordance. */
  addTab(): DocumentTab {
    return this.applyDocument(blankProject(), null, false);
  }

  activate(id: string): void {
    if (id === this._activeId()) return;
    const target = this._tabs().find(t => t.id === id);
    if (!target) return;
    this.captureActive();
    this._activeId.set(id);
    this.loadIntoWorkspace(target);
  }

  next(): void {
    this.step(1);
  }

  prev(): void {
    this.step(-1);
  }

  /** Close a tab, asking first when it holds unsaved changes. */
  close(id: string): boolean {
    const tab = this._tabs().find(t => t.id === id);
    if (!tab) return false;
    if (!this.confirmDiscard(tab)) return false;

    this.captureActive();
    const index = this._tabs().findIndex(t => t.id === id);
    const remaining = this._tabs().filter(t => t.id !== id);

    if (id !== this._activeId()) {
      this._tabs.set(remaining);
      return true;
    }

    const fallback = remaining[Math.max(0, Math.min(index, remaining.length - 1))] ?? null;
    const next = fallback ?? this.toRecord(blankProject(), null, null);
    this._tabs.set(fallback ? remaining : [next]);
    this._activeId.set(next.id);
    this.loadIntoWorkspace(next);
    return true;
  }

  /** Bind the active tab to a file path and mark it as saved. */
  markSaved(filePath: string | null): void {
    const project = this.store.project();
    const id = this._activeId();
    this._tabs.update(tabs => tabs.map(t => (t.id === id
      ? { ...t, filePath, title: project.title, project, savedRevision: project.updatedAt, isDirty: false }
      : t)));
  }

  /** Persist the live workspace into its tab record. */
  captureActive(): void {
    const active = this.active();
    if (!active) return;
    const project = this.store.project();
    const selectedSceneId = this.selection.selectedId();
    const isDirty = this.isDirty(active);
    this._tabs.update(tabs => tabs.map(t => (t.id === active.id
      ? { ...t, project, title: project.title, selectedSceneId, isDirty }
      : t)));
  }

  /** Every open document, with the active tab reflecting its live project. */
  documents(): DocumentTab[] {
    const activeId = this._activeId();
    const live = this.store.project();
    return this._tabs().map(t => (t.id === activeId ? { ...t, project: live } : t));
  }

  private applyDocument(project: VideoProject, filePath: string | null, reuseIfPristine: boolean): DocumentTab {
    this.captureActive();
    const active = this.active();
    const tab = this.toRecord(project, filePath, null);

    if (active && reuseIfPristine && !this.isDirty(active) && this.isPristine(active)) {
      const reused: DocumentTab = { ...tab, id: active.id };
      this._tabs.update(tabs => tabs.map(t => (t.id === reused.id ? reused : t)));
      this._activeId.set(reused.id);
      this.loadIntoWorkspace(reused);
      return reused;
    }

    this._tabs.update(tabs => [...tabs, tab]);
    this._activeId.set(tab.id);
    this.loadIntoWorkspace(tab);
    return tab;
  }

  private loadIntoWorkspace(tab: DocumentTab): void {
    this.organize.deactivate();
    this.selection.clear();
    this.store.load(tab.project);
    if (tab.selectedSceneId) this.selection.select(tab.selectedSceneId);
  }

  private step(delta: number): void {
    const tabs = this._tabs();
    if (tabs.length < 2) return;
    const index = tabs.findIndex(t => t.id === this._activeId());
    if (index < 0) return;
    this.activate(tabs[(index + delta + tabs.length) % tabs.length].id);
  }

  /** A tab the user never touched: no file, no edits, no content. */
  private isPristine(tab: DocumentTab): boolean {
    const project = tab.id === this._activeId() ? this.store.project() : tab.project;
    return tab.filePath === null
      && project.scenes.length === 0
      && (project.blocks?.length ?? 0) === 0
      && project.takes.length === 0;
  }

  private confirmDiscard(tab: DocumentTab): boolean {
    if (!this.isDirty(tab)) return true;
    return confirm(`"${this.label(tab)}" has unsaved changes. Close it anyway?`);
  }

  private toRecord(project: VideoProject, filePath: string | null, selectedSceneId: string | null): DocumentTab {
    return {
      id: uid(),
      title: project.title,
      filePath,
      savedRevision: project.updatedAt,
      isDirty: false,
      project,
      selectedSceneId,
    };
  }
}
