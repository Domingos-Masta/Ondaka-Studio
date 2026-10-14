import { settingsStore } from './settings-store.js';
import { recentStore } from './recent-store.js';
import { templatesStore } from './templates-store.js';
import { completeWithProvider, parseProvider, parseRequest, testProvider } from './ai-proxy.js';
import type { AppSettings } from './app-settings.model.js';
// app/main.ts
import { app, BrowserWindow, ipcMain, dialog, shell, session, systemPreferences, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;
const PROJECT_FILTERS = [{ name: 'Ondaka Studio Project', extensions: ['swproj'] }];
const DEV_SERVER_URL = 'http://localhost:4200';

/** Upper bounds for renderer payloads (bytes / string length). */
const MAX_TAKE_BYTES = 256 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 64 * 1024 * 1024;

let win: BrowserWindow | null = null;
let aboutWin: BrowserWindow | null = null;
let pendingOpenPath: string | null = null;

/**
 * Files the user explicitly opened or saved in this session. A renderer may
 * only write back to one of these, so a compromised page cannot drop files
 * anywhere on disk.
 */
const userFiles = new Set<string>();

/** A single app instance — a double-clicked .swproj while the app is running is
 * forwarded to the existing instance via the `second-instance` event. */
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}

function projectsDir() {
  return path.join(app.getPath('userData'), 'projects');
}

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

/** Rejects ids that could escape the directory they are joined into. */
function safeId(value: unknown, label: string): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value)) {
    throw new Error(`Invalid ${label}`);
  }
  return value;
}

/** Resolves `file` inside `dir`, refusing anything that escapes it. */
function resolveInside(dir: string, file: string): string {
  const root = path.resolve(dir);
  const resolved = path.resolve(root, file);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error('Path escapes the projects directory');
  }
  return resolved;
}

function projectsRoot(): string {
  return path.resolve(projectsDir());
}

/** Remembers a file the user picked so it can be written back to later. */
function trustUserFile(filePath: unknown): string | null {
  if (typeof filePath !== 'string' || !filePath.toLowerCase().endsWith('.swproj')) return null;
  const resolved = path.resolve(filePath);
  userFiles.add(resolved);
  return resolved;
}

/**
 * Writes through a temporary file in the same directory and renames it into
 * place, so a crash or an overlapping write can never leave a half-written
 * (unparseable) project on disk.
 */
async function writeFileAtomic(file: string, data: string | Uint8Array): Promise<void> {
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fs.writeFile(tmp, data);
    await fs.rename(tmp, file);
  } catch (err) {
    await fs.rm(tmp, { force: true }).catch(() => { });
    throw err;
  }
}

function jsonBody(value: unknown): string {
  const json = JSON.stringify(value);
  if (json.length > MAX_DOCUMENT_BYTES) throw new Error('Document is too large to save');
  return json;
}

/** Rejects non-plain-object payloads coming from the renderer. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** Only well-formed, plain-extension filters are forwarded to the native dialog. */
function sanitizeFilters(filters: unknown): Electron.FileFilter[] | undefined {
  if (!Array.isArray(filters)) return undefined;
  const clean: Electron.FileFilter[] = [];
  for (const entry of filters.slice(0, 10)) {
    if (!isPlainObject(entry)) continue;
    const { name, extensions } = entry as { name?: unknown; extensions?: unknown };
    if (typeof name !== 'string' || !Array.isArray(extensions)) continue;
    const exts = extensions.filter((e): e is string => typeof e === 'string' && /^[A-Za-z0-9]+$/.test(e));
    if (exts.length) clean.push({ name: name.slice(0, 64), extensions: exts });
  }
  return clean.length ? clean : undefined;
}

function isInternalUrl(url: string): boolean {
  return isDev ? url.startsWith(DEV_SERVER_URL) : url.startsWith('file://');
}

function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function pathFromArgv(argv: string[]): string | null {
  for (const arg of argv.slice(1)) {
    if (arg.toLowerCase().endsWith('.swproj')) return arg;
  }
  return null;
}

async function readAndSendProject(filePath: string): Promise<void> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const project = JSON.parse(raw);
    trustUserFile(filePath);
    addRecentFile(filePath, (project as { title?: string })?.title);
    win?.webContents.send('project:opened-externally', { filePath, project });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    win?.webContents.send('project:open-error', { filePath, message });
  }
}

function openProjectFile(filePath: string): void {
  if (!filePath || !filePath.toLowerCase().endsWith('.swproj')) return;
  if (win && !win.isDestroyed() && !win.webContents.isLoading()) {
    void readAndSendProject(filePath);
  } else {
    pendingOpenPath = filePath;
  }
}

function addRecentFile(filePath: string, title?: string): void {
  recentStore.add({
    path: filePath,
    title: title || path.basename(filePath),
    openedAt: new Date().toISOString(),
  });
  installApplicationMenu();
}

function buildRecentMenu(): Electron.MenuItemConstructorOptions[] {
  const files = recentStore.getAll();
  if (files.length === 0) {
    return [{ label: 'No Recent Projects', enabled: false }];
  }
  const items: Electron.MenuItemConstructorOptions[] = files.slice(0, 10).map((f) => ({
    label: f.title || path.basename(f.path),
    click: () => openProjectFile(f.path),
  }));
  items.push({ type: 'separator' });
  items.push({
    label: 'Clear Recent',
    click: () => {
      recentStore.clear();
      installApplicationMenu();
    },
  });
  return items;
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
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
    },
  });

  if (isDev) {
    console.log('Loading Dev Mode:', DEV_SERVER_URL);
    win.loadURL(DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexPath = path.join(__dirname, '../../dist/browser/index.html');
    console.log('Loading:', indexPath);
    win.loadFile(indexPath);
  }

  // Once the renderer is ready, flush any file that was queued while the
  // window was still loading (e.g. a .swproj opened via the OS).
  win.webContents.on('did-finish-load', () => {
    if (pendingOpenPath) {
      const pending = pendingOpenPath;
      pendingOpenPath = null;
      void readAndSendProject(pending);
    }
  });
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
    title: 'About Ondaka Studio',
    parent: win ?? undefined,
    modal: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
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
      <h1>Ondaka Studio</h1>
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
        { label: 'New Tab', accelerator: 'CmdOrCtrl+T', click: sendAction('newTab') },
        { label: 'Open Project…', accelerator: 'CmdOrCtrl+O', click: sendAction('open') },
        { label: 'Open Recent', submenu: buildRecentMenu() },
        { label: 'Save Project', accelerator: 'CmdOrCtrl+S', click: sendAction('save') },
        { label: 'Save Project As…', accelerator: 'Shift+CmdOrCtrl+S', click: sendAction('saveAs') },
        { type: 'separator' },
        { label: 'Import Script…', click: sendAction('import') },
        { label: 'Export Plan', click: sendAction('export') },
        { type: 'separator' },
        { label: 'Close Tab', accelerator: 'CmdOrCtrl+W', click: sendAction('closeTab') },
        { label: 'Close Window', accelerator: 'Shift+CmdOrCtrl+W', role: 'close' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { label: 'Next Tab', accelerator: 'Ctrl+Tab', click: sendAction('nextTab') },
        { label: 'Previous Tab', accelerator: 'Ctrl+Shift+Tab', click: sendAction('prevTab') },
        { type: 'separator' },
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
      ],
    },
    {
      label: 'Script',
      submenu: [
        { label: 'Generate from Title…', click: sendAction('generate') },
        { label: 'Fit Time to Script', click: sendAction('fitTime') },
        { label: 'Save as Template…', click: sendAction('saveTemplate') },
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


// macOS: file opened via Finder / "Open with" (fires before or after ready).
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  openProjectFile(filePath);
});

// Windows/Linux: a second launch (e.g. double-clicking a .swproj while the app
// is already open) is forwarded here.
app.on('second-instance', (_event, argv) => {
  const filePath = pathFromArgv(argv);
  if (filePath) openProjectFile(filePath);
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

// ---------------------------------------------------------------------------
// Hardening — navigation, window opening, permissions
// ---------------------------------------------------------------------------

/** Permissions the app itself needs (microphone for rehearsal, clipboard copy). */
const ALLOWED_PERMISSIONS = new Set(['media', 'clipboard-read', 'clipboard-sanitized-write']);

// The window keeps its privileged preload bridge, so it must never navigate
// away from the app. External links open in the user's browser instead, and
// nothing may embed a <webview>.
app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    if (isExternalUrl(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });

  contents.on('will-navigate', (event, url) => {
    if (isInternalUrl(url)) return;
    event.preventDefault();
    if (isExternalUrl(url)) void shell.openExternal(url);
  });

  contents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });
});

app.whenReady().then(async () => {
  if (!gotSingleInstanceLock) return;

  await ensureDir(projectsDir());

  // Only the app's own pages may use privileged APIs; everything else is denied.
  session.defaultSession.setPermissionRequestHandler((contents, permission, callback) => {
    callback(ALLOWED_PERMISSIONS.has(permission) && isInternalUrl(contents?.getURL() ?? ''));
  });
  session.defaultSession.setPermissionCheckHandler((_contents, permission, requestingOrigin) =>
    ALLOWED_PERMISSIONS.has(permission) && isInternalUrl(requestingOrigin));

  // macOS microphone permission
  if (process.platform === 'darwin') {
    try { await systemPreferences.askForMediaAccess('microphone'); } catch { /* noop */ }
  }

  installApplicationMenu();
  createWindow();

  // Windows/Linux: launched with a .swproj path while the app was closed.
  const argvPath = pathFromArgv(process.argv);
  if (argvPath) openProjectFile(argvPath);

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
      const raw = await fs.readFile(resolveInside(dir, f), 'utf-8');
      const p = JSON.parse(raw);
      out.push({ id: p.id, title: p.title, updatedAt: p.updatedAt, path: f });
    } catch { /* skip malformed */ }
  }
  return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
});

ipcMain.handle('projects:save', async (_e, project: { id: string }) => {
  const dir = projectsDir();
  await ensureDir(dir);
  if (!project || typeof project !== 'object') throw new Error('Invalid project payload');
  const file = resolveInside(dir, `${safeId(project.id, 'project id')}.json`);
  await writeFileAtomic(file, jsonBody(project));
  return file;
});

ipcMain.handle('projects:load', async (_e, id: string) => {
  const file = resolveInside(projectsDir(), `${safeId(id, 'project id')}.json`);
  const raw = await fs.readFile(file, 'utf-8');
  return JSON.parse(raw);
});

ipcMain.handle('projects:delete', async (_e, id: string) => {
  const file = resolveInside(projectsDir(), `${safeId(id, 'project id')}.json`);
  await fs.unlink(file).catch(() => { });
  return true;
});

// ---------------------------------------------------------------------------
// IPC — takes (audio rehearsal)
// ---------------------------------------------------------------------------

ipcMain.handle('takes:save', async (_e, payload: { projectId: string; takeId: string; buffer: ArrayBuffer }) => {
  if (!payload || !(payload.buffer instanceof ArrayBuffer)) throw new Error('Invalid take payload');
  if (payload.buffer.byteLength > MAX_TAKE_BYTES) throw new Error('Recording is too large to save');
  const projectId = safeId(payload.projectId, 'project id');
  const takeId = safeId(payload.takeId, 'take id');
  const dir = resolveInside(projectsRoot(), path.join(projectId, 'takes'));
  await ensureDir(dir);
  const file = resolveInside(dir, `${takeId}.webm`);
  await writeFileAtomic(file, Buffer.from(payload.buffer));
  return file;
});

ipcMain.handle('takes:open-folder', async (_e, projectId: string) => {
  const dir = resolveInside(projectsRoot(), path.join(safeId(projectId, 'project id'), 'takes'));
  await ensureDir(dir);
  await shell.openPath(dir);
  return true;
});

// ---------------------------------------------------------------------------
// IPC — export
// ---------------------------------------------------------------------------

ipcMain.handle('export:save-text', async (_e, payload: { suggestedName: string; content: string }) => {
  if (!payload || typeof payload.content !== 'string') throw new Error('Invalid export payload');
  const res = await dialog.showSaveDialog(win!, {
    defaultPath: path.basename(String(payload.suggestedName ?? 'export.txt')),
    filters: [{ name: 'Text', extensions: ['txt', 'csv', 'md'] }],
  });
  if (res.canceled || !res.filePath) return null;
  await writeFileAtomic(res.filePath, payload.content);
  return res.filePath;
});

ipcMain.handle('export:save-binary', async (_e, payload: { suggestedName: string; buffer: ArrayBuffer }) => {
  if (!payload || !(payload.buffer instanceof ArrayBuffer)) throw new Error('Invalid export payload');
  if (payload.buffer.byteLength > MAX_TAKE_BYTES) throw new Error('Export is too large to save');
  const res = await dialog.showSaveDialog(win!, {
    defaultPath: path.basename(String(payload.suggestedName ?? 'export.bin')),
  });
  if (res.canceled || !res.filePath) return null;
  await writeFileAtomic(res.filePath, Buffer.from(payload.buffer));
  return res.filePath;
});

ipcMain.handle('dialog:open-file', async (_e, filters?: { name: string; extensions: string[] }[]) => {
  const res = await dialog.showOpenDialog(win!, {
    properties: ['openFile'],
    filters: sanitizeFilters(filters),
  });
  return res.canceled ? null : res.filePaths[0] ?? null;
});


ipcMain.handle('project:save-as', async (_e, payload: { envelope: unknown; suggestedName: string }) => {
  const res = await dialog.showSaveDialog(win!, {
    defaultPath: path.basename(String(payload?.suggestedName ?? 'untitled.swproj')),
    filters: PROJECT_FILTERS,
  });
  if (res.canceled || !res.filePath) return null;
  const target = trustUserFile(res.filePath);
  if (!target) throw new Error('Invalid .swproj path');
  await writeFileAtomic(target, jsonBody(payload.envelope));
  addRecentFile(target, (payload.envelope as { project?: { title?: string } })?.project?.title);
  return target;
});

ipcMain.handle('project:save-to-path', async (_e, payload: { filePath: string; envelope: unknown }) => {
  const target = typeof payload?.filePath === 'string' ? path.resolve(payload.filePath) : '';
  // Only paths the user opened or chose in a save dialog may be written to.
  if (!target || !userFiles.has(target)) {
    throw new Error('Refusing to write to a path this session did not grant');
  }
  await writeFileAtomic(target, jsonBody(payload.envelope));
  addRecentFile(target, (payload.envelope as { project?: { title?: string } })?.project?.title);
  return target;
});

ipcMain.handle('project:open-file', async () => {
  const res = await dialog.showOpenDialog(win!, {
    properties: ['openFile'],
    filters: PROJECT_FILTERS,
  });
  if (res.canceled || !res.filePaths[0]) return null;
  const filePath = trustUserFile(res.filePaths[0]);
  if (!filePath) return null;
  const raw = await fs.readFile(filePath, 'utf-8');
  const envelope = JSON.parse(raw);
  addRecentFile(filePath, (envelope as { project?: { title?: string } })?.project?.title);
  return { filePath, project: envelope };
});

ipcMain.handle('settings:getAll', () => settingsStore.getAll());
ipcMain.handle('settings:patch', (_e, partial: unknown) => {
  if (!isPlainObject(partial)) throw new Error('Invalid settings patch');
  return settingsStore.patch(partial as Partial<AppSettings>);
});

// ---------------------------------------------------------------------------
// IPC — AI provider proxy
// ---------------------------------------------------------------------------

// Provider keys stay in the main process: the renderer sends the conversation,
// main attaches the key and talks to the provider.
ipcMain.handle('ai:complete', async (_e, payload: unknown) => {
  const { providerId, request } = (payload ?? {}) as { providerId?: unknown; request?: unknown };
  const config = settingsStore.getProvider(typeof providerId === 'string' ? providerId : undefined);
  if (!config) throw new Error('No AI provider configured. Open Settings to add one.');
  if (!config.enabled) throw new Error(`Provider "${config.name}" is disabled.`);
  return completeWithProvider(config, parseRequest(request));
});

ipcMain.handle('ai:test', async (_e, payload: unknown) => {
  const requested = parseProvider((payload as { provider?: unknown } | null)?.provider);
  // An empty key means "use the one already stored for this provider".
  const config = requested.apiKey
    ? requested
    : { ...requested, apiKey: settingsStore.getProvider(requested.id)?.apiKey };
  return testProvider(config);
});

ipcMain.handle('templates:getAll', () => templatesStore.getAll());
ipcMain.handle('templates:saveAll', (_e, templates: unknown[]) => {
  if (!Array.isArray(templates) || templates.length > 500) throw new Error('Invalid templates payload');
  templatesStore.saveAll(templates);
  return true;
});

// API key material is encrypted at rest by settings-store (OS backed when
// Electron's safeStorage is available).