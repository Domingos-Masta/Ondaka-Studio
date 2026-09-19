// app/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

export interface ProjectSummary {
  id: string;
  title: string;
  updatedAt: string;
  path: string;
}

export type MenuAction =
  | 'new' | 'open' | 'save' | 'saveAs'
  | 'generate' | 'import' | 'settings'
  | 'present' | 'chapters' | 'export' | 'fitTime';

contextBridge.exposeInMainWorld('api', {
  // Projects
  listProjects: (): Promise<ProjectSummary[]> => ipcRenderer.invoke('projects:list'),
  saveProject:  (project: unknown)          => ipcRenderer.invoke('projects:save', project),
  loadProject:  (id: string)                => ipcRenderer.invoke('projects:load', id),
  deleteProject:(id: string)                => ipcRenderer.invoke('projects:delete', id),

  // Takes
  saveTake:     (payload: { projectId: string; takeId: string; buffer: ArrayBuffer }) =>
                  ipcRenderer.invoke('takes:save', payload),
  openTakesFolder: (projectId: string) => ipcRenderer.invoke('takes:open-folder', projectId),

  // Export
  saveTextFile:   (payload: { suggestedName: string; content: string }) =>
                    ipcRenderer.invoke('export:save-text', payload),
  saveBinaryFile: (payload: { suggestedName: string; buffer: ArrayBuffer }) =>
                    ipcRenderer.invoke('export:save-binary', payload),
  openFileDialog: (filters?: { name: string; extensions: string[] }[]) =>
                    ipcRenderer.invoke('dialog:open-file', filters),

  // Project file I/O
  saveProjectAs: (envelope: unknown, suggestedName: string) =>
    ipcRenderer.invoke('project:save-as', { envelope, suggestedName }),

  saveProjectToPath: (filePath: string, envelope: unknown) =>
    ipcRenderer.invoke('project:save-to-path', { filePath, envelope }),

  openProjectFile: () =>
    ipcRenderer.invoke('project:open-file'),

  // Settings
  settings: {
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    patch: (partial: unknown) => ipcRenderer.invoke('settings:patch', partial),
  },

  onMenuAction: (callback: (action: MenuAction) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, action: MenuAction) => callback(action);
    ipcRenderer.on('menu:action', listener);
    return () => ipcRenderer.removeListener('menu:action', listener);
  },
});

declare global {
  interface Window {
    api: {
      listProjects: () => Promise<ProjectSummary[]>;
      saveProject: (project: unknown) => Promise<string>;
      loadProject: (id: string) => Promise<unknown>;
      deleteProject: (id: string) => Promise<boolean>;
      saveTake: (payload: { projectId: string; takeId: string; buffer: ArrayBuffer }) => Promise<string>;
      openTakesFolder: (projectId: string) => Promise<boolean>;
      saveTextFile: (payload: { suggestedName: string; content: string }) => Promise<string | null>;
      saveBinaryFile: (payload: { suggestedName: string; buffer: ArrayBuffer }) => Promise<string | null>;
      openFileDialog: (filters?: { name: string; extensions: string[] }[]) => Promise<string | null>;

      saveProjectAs: (envelope: unknown, suggestedName: string) => Promise<string | null>;
      saveProjectToPath: (filePath: string, envelope: unknown) => Promise<string>;
      openProjectFile: () => Promise<{ filePath: string; project: unknown } | null>;
      settings: {
        getAll: () => Promise<unknown>;
        patch: (partial: unknown) => Promise<void>;
      };
      onMenuAction: (callback: (action: MenuAction) => void) => () => void;

    };
  }
}