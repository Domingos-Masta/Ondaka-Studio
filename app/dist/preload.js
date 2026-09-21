// app/preload.ts
import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('api', {
    // Projects
    listProjects: () => ipcRenderer.invoke('projects:list'),
    saveProject: (project) => ipcRenderer.invoke('projects:save', project),
    loadProject: (id) => ipcRenderer.invoke('projects:load', id),
    deleteProject: (id) => ipcRenderer.invoke('projects:delete', id),
    // Takes
    saveTake: (payload) => ipcRenderer.invoke('takes:save', payload),
    openTakesFolder: (projectId) => ipcRenderer.invoke('takes:open-folder', projectId),
    // Export
    saveTextFile: (payload) => ipcRenderer.invoke('export:save-text', payload),
    saveBinaryFile: (payload) => ipcRenderer.invoke('export:save-binary', payload),
    openFileDialog: (filters) => ipcRenderer.invoke('dialog:open-file', filters),
    // Project file I/O
    saveProjectAs: (envelope, suggestedName) => ipcRenderer.invoke('project:save-as', { envelope, suggestedName }),
    saveProjectToPath: (filePath, envelope) => ipcRenderer.invoke('project:save-to-path', { filePath, envelope }),
    openProjectFile: () => ipcRenderer.invoke('project:open-file'),
    // Settings
    settings: {
        getAll: () => ipcRenderer.invoke('settings:getAll'),
        patch: (partial) => ipcRenderer.invoke('settings:patch', partial),
    },
    onMenuAction: (callback) => {
        const listener = (_event, action) => callback(action);
        ipcRenderer.on('menu:action', listener);
        return () => ipcRenderer.removeListener('menu:action', listener);
    },
    onOpenExternalFile: (callback) => {
        const listener = (_event, payload) => callback(payload);
        ipcRenderer.on('project:opened-externally', listener);
        return () => ipcRenderer.removeListener('project:opened-externally', listener);
    },
    onOpenFileError: (callback) => {
        const listener = (_event, payload) => callback(payload);
        ipcRenderer.on('project:open-error', listener);
        return () => ipcRenderer.removeListener('project:open-error', listener);
    },
});
//# sourceMappingURL=preload.js.map