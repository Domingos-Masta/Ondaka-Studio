import { settingsStore } from './settings-store.js';
// app/main.ts
import { app, BrowserWindow, ipcMain, dialog, shell, systemPreferences, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;
const SWPROJ_FILTERS = [{ name: 'ScriptWriter Project', extensions: ['swproj'] }];

let win: BrowserWindow | null = null;
let aboutWin: BrowserWindow | null = null;

function projectsDir() {
  return path.join(app.getPath('userData'), 'projects');
}

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#0a0a0b',
    titleBarStyle: 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    console.log('Loading Dev Mode:', 'http://localhost:4200');
    win.loadURL('http://localhost:4200');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexPath = path.join(__dirname, '../../dist/browser/index.html');
    console.log('Loading:', indexPath);
    win.loadFile(indexPath);
  }
}

function createAboutWindow() {
  if (aboutWin && !aboutWin.isDestroyed()) {
    aboutWin.focus();
    return;
  }

  aboutWin = new BrowserWindow({
    width: 440,
    height: 470,
    resizable: false,
    minimizable: false,
    maximizable: false,
    title: 'About ScriptWriter Pro',
    parent: win ?? undefined,
    modal: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  aboutWin.on('closed', () => { aboutWin = null; });
  void aboutWin.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(`
    <!doctype html>
    <html><head><meta charset="utf-8"><style>
      body { margin: 0; padding: 32px; background: #0a0a0b; color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, sans-serif; text-align: center; }
      .mark { width: 92px; height: 92px; margin: 0 auto 18px; border-radius: 22px; background: #0f172a; display: grid; place-items: center; }
      h1 { margin: 0 0 8px; font-size: 22px; } p { color: #a1a1aa; margin: 8px 0; line-height: 1.45; } .meta { margin-top: 22px; font-size: 12px; color: #71717a; }
      button { margin-top: 24px; border: 0; border-radius: 6px; padding: 8px 24px; background: #f59e0b; color: #18181b; font-weight: 600; cursor: pointer; } button:hover { background: #fbbf24; }
    </style></head><body>
      <div class="mark"><svg viewBox="0 0 512 512" width="76" height="76" fill="none"><path d="M168 168l112 88-112 88" stroke="#f8fafc" stroke-width="36" stroke-linecap="round" stroke-linejoin="round"/><path d="M264 344h96" stroke="#f59e0b" stroke-width="36" stroke-linecap="round"/></svg></div>
      <h1>ScriptWriter Pro</h1>
      <p>A focused workspace for planning, writing, adapting, and presenting video scripts.</p>
      <p>Built for clear scene structure, timing, AI-assisted revision, and distraction-free rehearsal.</p>
      <p class="meta">Created by Domingos Fernando<br>Version ${app.getVersion()}</p>
      <button type="button" onclick="window.close()">Close</button>
    </body></html>
  `)}`);
}

function installApplicationMenu() {
  const sendAction = (action: string) => () => win?.webContents.send('menu:action', action);
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { label: `About ${app.name}`, click: createAboutWindow },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [
        { label: 'New Project', accelerator: 'CmdOrCtrl+N', click: sendAction('new') },
        { label: 'Open Project…', accelerator: 'CmdOrCtrl+O', click: sendAction('open') },
        { label: 'Save Project', accelerator: 'CmdOrCtrl+S', click: sendAction('save') },
        { label: 'Save Project As…', accelerator: 'Shift+CmdOrCtrl+S', click: sendAction('saveAs') },
        { type: 'separator' },
        { label: 'Import Script…', click: sendAction('import') },
        { label: 'Export Plan', click: sendAction('export') },
        { type: 'separator' },
        { role: 'close' },
      ],
    },
    {
      label: 'Script',
      submenu: [
        { label: 'Generate from Title…', click: sendAction('generate') },
        { label: 'Fit Time to Script', click: sendAction('fitTime') },
        { label: 'Present', click: sendAction('present') },
        { label: 'Chapters', click: sendAction('chapters') },
        { label: 'Settings…', click: sendAction('settings') },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteAndMatchStyle' },
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}


app.whenReady().then(async () => {
  await ensureDir(projectsDir());

  // macOS microphone permission
  if (process.platform === 'darwin') {
    try { await systemPreferences.askForMediaAccess('microphone'); } catch { /* noop */ }
  }

  installApplicationMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ---------------------------------------------------------------------------
// IPC — project persistence
// ---------------------------------------------------------------------------

ipcMain.handle('projects:list', async () => {
  const dir = projectsDir();
  await ensureDir(dir);
  const files = await fs.readdir(dir);
  const out: { id: string; title: string; updatedAt: string; path: string }[] = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    try {
      const raw = await fs.readFile(path.join(dir, f), 'utf-8');
      const p = JSON.parse(raw);
      out.push({ id: p.id, title: p.title, updatedAt: p.updatedAt, path: f });
    } catch { /* skip malformed */ }
  }
  return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
});

ipcMain.handle('projects:save', async (_e, project: { id: string }) => {
  const dir = projectsDir();
  await ensureDir(dir);
  const file = path.join(dir, `${project.id}.json`);
  await fs.writeFile(file, JSON.stringify(project, null, 2), 'utf-8');
  return file;
});

ipcMain.handle('projects:load', async (_e, id: string) => {
  const file = path.join(projectsDir(), `${id}.json`);
  const raw = await fs.readFile(file, 'utf-8');
  return JSON.parse(raw);
});

ipcMain.handle('projects:delete', async (_e, id: string) => {
  const file = path.join(projectsDir(), `${id}.json`);
  await fs.unlink(file).catch(() => { });
  return true;
});

// ---------------------------------------------------------------------------
// IPC — takes (audio rehearsal)
// ---------------------------------------------------------------------------

ipcMain.handle('takes:save', async (_e, payload: { projectId: string; takeId: string; buffer: ArrayBuffer }) => {
  const dir = path.join(projectsDir(), payload.projectId, 'takes');
  await ensureDir(dir);
  const file = path.join(dir, `${payload.takeId}.webm`);
  await fs.writeFile(file, Buffer.from(payload.buffer));
  return file;
});

ipcMain.handle('takes:open-folder', async (_e, projectId: string) => {
  const dir = path.join(projectsDir(), projectId, 'takes');
  await ensureDir(dir);
  await shell.openPath(dir);
  return true;
});

// ---------------------------------------------------------------------------
// IPC — export
// ---------------------------------------------------------------------------

ipcMain.handle('export:save-text', async (_e, payload: { suggestedName: string; content: string }) => {
  const res = await dialog.showSaveDialog(win!, {
    defaultPath: payload.suggestedName,
    filters: [{ name: 'Text', extensions: ['txt', 'csv', 'md'] }],
  });
  if (res.canceled || !res.filePath) return null;
  await fs.writeFile(res.filePath, payload.content, 'utf-8');
  return res.filePath;
});

ipcMain.handle('export:save-binary', async (_e, payload: { suggestedName: string; buffer: ArrayBuffer }) => {
  const res = await dialog.showSaveDialog(win!, { defaultPath: payload.suggestedName });
  if (res.canceled || !res.filePath) return null;
  await fs.writeFile(res.filePath, Buffer.from(payload.buffer));
  return res.filePath;
});

ipcMain.handle('dialog:open-file', async (_e, filters?: { name: string; extensions: string[] }[]) => {
  const res = await dialog.showOpenDialog(win!, { properties: ['openFile'], filters });
  return res.canceled ? null : res.filePaths[0];
});


ipcMain.handle('project:save-as', async (_e, payload: { envelope: unknown; suggestedName: string }) => {
  const res = await dialog.showSaveDialog(win!, {
    defaultPath: payload.suggestedName,
    filters: SWPROJ_FILTERS,
  });
  if (res.canceled || !res.filePath) return null;
  await fs.writeFile(res.filePath, JSON.stringify(payload.envelope, null, 2), 'utf-8');
  return res.filePath;
});

ipcMain.handle('project:save-to-path', async (_e, payload: { filePath: string; envelope: unknown }) => {
  if (typeof payload.filePath !== 'string' || !payload.filePath.endsWith('.swproj')) {
    throw new Error('Invalid .swproj path');
  }
  await fs.writeFile(payload.filePath, JSON.stringify(payload.envelope, null, 2), 'utf-8');
  return payload.filePath;
});

ipcMain.handle('project:open-file', async () => {
  const res = await dialog.showOpenDialog(win!, {
    properties: ['openFile'],
    filters: SWPROJ_FILTERS,
  });
  if (res.canceled || !res.filePaths[0]) return null;
  const filePath = res.filePaths[0];
  const raw = await fs.readFile(filePath, 'utf-8');
  const envelope = JSON.parse(raw);
  return { filePath, project: envelope };
});

ipcMain.handle('settings:getAll', () => settingsStore.getAll());
ipcMain.handle('settings:patch', (_e, partial) => settingsStore.patch(partial));

// Optional: secure at-rest storage for a specific API key using safeStorage
// import { safeStorage } from 'electron';
// ipcMain.handle('secure:encrypt', (_e, plain: string) => {
//   if (!safeStorage.isEncryptionAvailable()) return { encrypted: false, value: plain };
//   return { encrypted: true, value: safeStorage.encryptString(plain).toString('base64') };
// });
// ipcMain.handle('secure:decrypt', (_e, payload: { encrypted: boolean; value: string }) => {
//   if (!payload.encrypted) return payload.value;
//   return safeStorage.decryptString(Buffer.from(payload.value, 'base64'));
// });