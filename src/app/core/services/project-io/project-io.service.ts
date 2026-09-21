// src/app/core/services/project-io.service.ts
import { Injectable, computed, inject, signal } from '@angular/core';
import { ToastService } from '../toast/toast.service';
import { ProjectStore } from '../project/project.store';
import { VideoProject } from '../../models/project.model';

interface ProjectEnvelope {
    format: 'swproj';
    version: number;
    savedAt: string;
    project: VideoProject;
}

@Injectable({ providedIn: 'root' })
export class ProjectIoService {
    private store = inject(ProjectStore);
    private toast = inject(ToastService);

    /** Current file path (null = never saved to disk). */
    readonly filePath = signal<string | null>(null);

    readonly displayName = computed(() => {
        const p = this.filePath();
        if (!p) return this.store.project().title;
        return p.split(/[\\/]/).pop() ?? p;
    });

    readonly isDirty = signal(false);

    constructor() {
        // Mark dirty whenever the project signal changes (compare against last saved snapshot).
        const lastSaved = JSON.stringify(this.store.project());
        setInterval(() => {
            const now = JSON.stringify(this.store.project());
            this.isDirty.set(now !== lastSaved);
            (this as any)._lastSaved = lastSaved;
        }, 800);

        // A .swproj opened from the OS (double-click / "Open with") is delivered
        // here by the Electron main process.
        const api = (window as any).api;
        api?.onOpenExternalFile?.((payload: { filePath: string; project: unknown }) => {
            this.loadEnvelope(payload.project, payload.filePath);
        });
        api?.onOpenFileError?.((payload: { filePath: string; message: string }) => {
            this.toast.error(`Open failed: ${payload.message}`);
        });
    }

    async save(): Promise<boolean> {
        const path = this.filePath();
        if (!path) return this.saveAs();
        try {
            await (window as any).api.saveProjectToPath(path, this.envelope());
            this.isDirty.set(false);
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
            const path = await (window as any).api.saveProjectAs(this.envelope(), suggested);
            if (!path) return false;
            this.filePath.set(String(path));
            this.isDirty.set(false);
            this.toast.success(`Saved — ${this.displayName()}`);
            return true;
        } catch (err) {
            this.toast.error(`Save failed: ${(err as Error).message}`);
            return false;
        }
    }

    async open(): Promise<boolean> {
        try {
            const result = await (window as any).api.openProjectFile();
            if (!result) return false;
            return this.loadEnvelope(result.project, String(result.filePath));
        } catch (err) {
            this.toast.error(`Open failed: ${(err as Error).message}`);
            return false;
        }
    }

    /** Load a .swproj envelope (already parsed by the main process). */
    private loadEnvelope(envelope: unknown, filePath: string): boolean {
        const env = envelope as ProjectEnvelope;
        if (env?.format !== 'swproj') {
            this.toast.error('Not an Ondaka Studio project file');
            return false;
        }
        // Basic shape validation before loading
        if (!env.project?.scenes || !Array.isArray(env.project.scenes)) {
            this.toast.error('Project file is malformed');
            return false;
        }
        const project: VideoProject = {
            ...env.project,
            blocks: env.project.blocks ?? [],
            scenes: (env.project.scenes ?? []).map((s) => ({
                ...s,
                aiRevisions: s.aiRevisions ?? [],
            })),
        };
        this.store.load(project);
        this.filePath.set(filePath);
        this.isDirty.set(false);
        this.toast.success(`Opened — ${this.displayName()}`);
        return true;
    }

    newProject() {
        if (this.isDirty() && !confirm('Discard unsaved changes?')) return;
        this.store.newProject();
        this.filePath.set(null);
        this.isDirty.set(false);
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