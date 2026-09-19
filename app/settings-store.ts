import type { AppSettings } from "./app-settings.model.js";
import Store from 'electron-store';

interface Schema {
  appSettings: Partial<AppSettings>;
}

const store = new Store<Schema>({
  name: 'scriptwriter-settings',
  encryptionKey: 'swpro-settings-v1', // obfuscation; see note below
});

export const settingsStore = {
  getAll(): Partial<AppSettings> {
    return store.get('appSettings', {});
  },
  patch(partial: Partial<AppSettings>): Partial<AppSettings> {
    const current = store.get('appSettings', {});
    const next = { ...current, ...partial };
    store.set('appSettings', next);
    return next;
  },
};
