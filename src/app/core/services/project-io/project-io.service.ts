// src/app/core/services/project-io.service.ts
import { Injectable, computed, inject } from '@angular/core';
import { ToastService } from '../toast/toast.service';
import { ProjectStore, projectFromTemplate } from '../project/project.store';
import { NewProjectOptions, VideoProject } from '../../models/project.model';
import { ProjectTemplate } from '../../models/template.model';
import { TabsService } from '../tabs/tabs.service';

interface ProjectEnvelope {
    format: 'swproj';
    version: number;
    savedAt: string;
    project: VideoProject;
}

@Injectable({ providedIn: 'root' })
export class ProjectIoService {
    private store = inject(ProjectStore);
    private tabs = inject(TabsService);
    private toast = inject(ToastService);

    /** Path of the active tab's file (null = never saved to disk). */
    readonly filePath = computed(() => this.tabs.active()?.filePath ?? null);

    readonly isDirty = this.tabs.activeIsDirty;

    readonly displayName = computed(() => {
        const p = this.filePath();
        if (!p) return this.store.project().title;
        return p.split(/[\\/]/).pop() ?? p;
    });

    constructor() {
        const api = typeof window === 'undefined' ? undefined : window.api;
        // A .swproj opened from the OS (double-click / "Open with") is delivered
        // here by the Electron main process and opens in its own tab.
        api?.onOpenExternalFile?.((payload: { filePath: string; project: unknown }) => {
            this.openEnvelope(payload.project, payload.filePath);
        });
        api?.onOpenFileError?.((payload: { filePath: string; message: string }) => {
            this.toast.error(`Open failed: ${payload.message}`);
        });
    }

    async save(): Promise<boolean> {
        const path = this.filePath();
        if (!path) return this.saveAs();
        try {
            await window.api.saveProjectToPath(path, this.envelope());
            this.tabs.markSaved(path);
            this.toast.success(`Saved — ${this.displayName()}`);
            return true;
        } catch (err) {
            this.toast.error(`Save failed: ${(err as Error).message}`);
            return false;
        }
    }

    async saveAs(): Promise<boolean> {
        const suggested = `${this.slug()}.swproj`;
        try {
            const path = await window.api.saveProjectAs(this.envelope(), suggested);
            if (!path) return false;
            this.tabs.markSaved(String(path));
            this.toast.success(`Saved — ${this.displayName()}`);
            return true;
        } catch (err) {
            this.toast.error(`Save failed: ${(err as Error).message}`);
            return false;
        }
    }

    async open(): Promise<boolean> {
        try {
            const result = await window.api.openProjectFile();
            if (!result) return false;
            return this.openEnvelope(result.project, String(result.filePath));
        } catch (err) {
            this.toast.error(`Open failed: ${(err as Error).message}`);
            return false;
        }
    }

    /** Load a .swproj envelope (already parsed by the main process) into its own tab. */
    openEnvelope(envelope: unknown, filePath: string | null): boolean {
        const project = parseEnvelope(envelope);
        if (!project) {
            this.toast.error('Project file is malformed');
            return false;
        }
        this.tabs.openDocument(project, filePath, true);
        this.toast.success(`Opened — ${this.displayName()}`);
        return true;
    }

    /** Opens a new workspace tab — the current tab is left untouched. */
    newProject(options?: NewProjectOptions): void {
        this.tabs.newDocument(options);
    }

    newFromTemplate(template: ProjectTemplate, title?: string): void {
        this.tabs.openDocument(projectFromTemplate(template, title), null, true);
    }

    private envelope(): ProjectEnvelope {
        return {
            format: 'swproj',
            version: 1,
            savedAt: new Date().toISOString(),
            project: this.store.project(),
        };
    }

    private slug() {
        return String(this.store.project().title ?? 'untitled')
            .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'untitled';
    }
}

/** Validates the on-disk shape of a project file before it reaches the store. */
function parseEnvelope(envelope: unknown): VideoProject | null {
    const env = envelope as ProjectEnvelope | null;
    if (!env || env.format !== 'swproj') return null;
    const project = env.project;
    if (!project || !Array.isArray(project.scenes)) return null;
    return {
        ...project,
        blocks: project.blocks ?? [],
        takes: project.takes ?? [],
        scenes: project.scenes
            .filter(scene => !!scene && typeof scene.id === 'string')
            .map(scene => ({
                ...scene,
                script: typeof scene.script === 'string' ? scene.script : '',
                notes: typeof scene.notes === 'string' ? scene.notes : '',
                assets: scene.assets ?? [],
                aiRevisions: scene.aiRevisions ?? [],
            })),
    };
}
