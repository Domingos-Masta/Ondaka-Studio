import { safeStorage } from 'electron';
import Store from 'electron-store';
// The fixed key only obfuscates the store file; secrets inside it are additionally
// encrypted with the OS keychain through safeStorage (see read/write below).
const store = new Store({
    name: 'ondaka-settings',
    encryptionKey: 'swpro-settings-v1',
});
function encrypt(value) {
    if (!safeStorage.isEncryptionAvailable())
        return null;
    return safeStorage.encryptString(JSON.stringify(value)).toString('base64');
}
function read() {
    const encrypted = store.get('appSettingsEnc');
    if (typeof encrypted === 'string') {
        try {
            if (safeStorage.isEncryptionAvailable()) {
                return JSON.parse(safeStorage.decryptString(Buffer.from(encrypted, 'base64')));
            }
        }
        catch {
            // Fall through to the legacy payload — a key from another machine/user cannot be read.
        }
    }
    return store.get('appSettings', {});
}
function write(value) {
    const encrypted = encrypt(value);
    if (encrypted) {
        store.set('appSettingsEnc', encrypted);
        store.delete('appSettings');
        return;
    }
    // No OS-backed encryption available (e.g. Linux without a keyring): keep the
    // value in the obfuscated store rather than losing the user's configuration.
    store.set('appSettings', value);
}
/**
 * Provider list as the renderer may see it: keys are stripped and replaced by a
 * `hasApiKey` flag, so the renderer knows a key exists without holding it.
 */
function withoutSecrets(settings) {
    if (!settings.providers)
        return settings;
    return {
        ...settings,
        providers: settings.providers.map(({ apiKey, ...provider }) => ({
            ...provider,
            hasApiKey: typeof apiKey === 'string' && apiKey.length > 0,
        })),
    };
}
/**
 * An incoming provider keeps the stored key unless it explicitly replaces it
 * (`apiKey` absent = untouched, empty string = cleared, value = new key).
 */
function mergeProviders(current, incoming) {
    const stored = new Map((current ?? []).map(provider => [provider.id, provider]));
    return incoming.map(provider => {
        const { hasApiKey: _derived, ...rest } = provider;
        const apiKey = rest.apiKey === undefined ? stored.get(provider.id)?.apiKey : rest.apiKey;
        return apiKey ? { ...rest, apiKey } : rest;
    });
}
export const settingsStore = {
    /** Sanitized settings for the renderer. */
    getAll() {
        return withoutSecrets(read());
    },
    /** A provider including its key — main-process use only (AI proxy). */
    getProvider(providerId) {
        const settings = read();
        const providers = settings.providers ?? [];
        if (providerId)
            return providers.find(p => p.id === providerId);
        return providers.find(p => p.id === settings.defaultProviderId && p.enabled);
    },
    patch(partial) {
        const current = read();
        const next = {
            ...current,
            ...partial,
            ...(partial.providers ? { providers: mergeProviders(current.providers, partial.providers) } : {}),
        };
        write(next);
        return withoutSecrets(next);
    },
};
//# sourceMappingURL=settings-store.js.map