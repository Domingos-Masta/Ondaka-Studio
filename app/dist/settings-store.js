import Store from 'electron-store';
const store = new Store({
    name: 'scriptwriter-settings',
    encryptionKey: 'swpro-settings-v1', // obfuscation; see note below
});
export const settingsStore = {
    getAll() {
        return store.get('appSettings', {});
    },
    patch(partial) {
        const current = store.get('appSettings', {});
        const next = { ...current, ...partial };
        store.set('appSettings', next);
        return next;
    },
};
//# sourceMappingURL=settings-store.js.map