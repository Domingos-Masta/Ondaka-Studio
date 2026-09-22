import Store from 'electron-store';

export interface RecentFile {
  path: string;
  title: string;
  openedAt: string;
}

interface Schema {
  files: RecentFile[];
}

const store = new Store<Schema>({
  name: 'ondaka-recent',
  defaults: { files: [] },
});

export const recentStore = {
  getAll(): RecentFile[] {
    return store.get('files', []);
  },
  add(file: RecentFile): void {
    const files = store.get('files', []).filter((f) => f.path !== file.path);
    files.unshift(file);
    store.set('files', files.slice(0, 10));
  },
  clear(): void {
    store.set('files', []);
  },
};
