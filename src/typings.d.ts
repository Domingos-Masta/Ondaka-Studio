/**
 * Ambient types for the renderer. `window.api` mirrors the surface exposed by
 * `app/preload.ts` through contextBridge — keep the two in sync.
 */
declare const nodeModule: NodeModule;
declare const mammoth: {
  convertToHtml(input: { arrayBuffer: ArrayBuffer }): Promise<{ value: string; messages: any[] }>;
  extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<{ value: string; messages: any[] }>;
};
interface NodeModule {
  id: string;
}

type MenuAction =
  | 'new' | 'open' | 'save' | 'saveAs'
  | 'generate' | 'import' | 'settings'
  | 'present' | 'chapters' | 'export' | 'fitTime' | 'saveTemplate'
  | 'newTab' | 'closeTab' | 'nextTab' | 'prevTab';

interface ProjectSummary {
  id: string;
  title: string;
  updatedAt: string;
  path: string;
}

interface OndakaApi {
  listProjects(): Promise<ProjectSummary[]>;
  saveProject(project: unknown): Promise<string>;
  loadProject(id: string): Promise<unknown>;
  deleteProject(id: string): Promise<boolean>;
  saveTake(payload: { projectId: string; takeId: string; buffer: ArrayBuffer }): Promise<string>;
  openTakesFolder(projectId: string): Promise<boolean>;
  saveTextFile(payload: { suggestedName: string; content: string }): Promise<string | null>;
  saveBinaryFile(payload: { suggestedName: string; buffer: ArrayBuffer }): Promise<string | null>;
  openFileDialog(filters?: { name: string; extensions: string[] }[]): Promise<string | null>;
  saveProjectAs(envelope: unknown, suggestedName: string): Promise<string | null>;
  saveProjectToPath(filePath: string, envelope: unknown): Promise<string>;
  openProjectFile(): Promise<{ filePath: string; project: unknown } | null>;
  settings: {
    getAll(): Promise<Partial<import('./app/core/models/app-settings.model').AppSettings>>;
    patch(p: Partial<import('./app/core/models/app-settings.model').AppSettings>): Promise<Partial<import('./app/core/models/app-settings.model').AppSettings>>;
  };
  /** AI calls run in the main process; provider keys never reach the renderer. */
  ai: {
    complete(payload: { providerId?: string | null; request: unknown }): Promise<unknown>;
    test(payload: { provider: unknown }): Promise<boolean>;
  };
  templates: {
    getAll(): Promise<unknown[]>;
    saveAll(templates: unknown[]): Promise<boolean>;
  };
  onMenuAction(callback: (action: MenuAction) => void): () => void;
  onOpenExternalFile(callback: (payload: { filePath: string; project: unknown }) => void): () => void;
  onOpenFileError(callback: (payload: { filePath: string; message: string }) => void): () => void;
}

interface Window {
  api: OndakaApi;
}
