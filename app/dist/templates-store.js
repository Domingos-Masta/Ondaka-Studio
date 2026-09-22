import Store from 'electron-store';
const store = new Store({
    name: 'ondaka-templates',
    defaults: { templates: [] },
});
export const templatesStore = {
    getAll() {
        return store.get('templates', []);
    },
    saveAll(templates) {
        store.set('templates', templates);
    },
};
//# sourceMappingURL=templates-store.js.map