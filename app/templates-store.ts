import Store from 'electron-store';

interface Schema {
  templates: unknown[];
}

const store = new Store<Schema>({
  name: 'ondaka-templates',
  defaults: { templates: [] },
});

export const templatesStore = {
  getAll(): unknown[] {
    return store.get('templates', []);
  },
  saveAll(templates: unknown[]): void {
    store.set('templates', templates);
  },
};
