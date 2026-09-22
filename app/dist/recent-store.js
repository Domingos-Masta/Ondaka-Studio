import Store from 'electron-store';
const store = new Store({
    name: 'ondaka-recent',
    defaults: { files: [] },
});
export const recentStore = {
    getAll() {
        return store.get('files', []);
    },
    add(file) {
        const files = store.get('files', []).filter((f) => f.path !== file.path);
        files.unshift(file);
        store.set('files', files.slice(0, 10));
    },
    clear() {
        store.set('files', []);
    },
};
//# sourceMappingURL=recent-store.js.map