# Security Policy

## Supported versions

| Version | Supported |
| --- | --- |
| Latest release | Yes |
| Older releases | No, unless explicitly stated in a release note or security advisory |

The current release receives security fixes. Older releases are considered unsupported unless a maintainer explicitly says otherwise.

## Reporting a vulnerability

Do not open a public issue for a security report.

Email domingos.m.fernando@gmail.com with:

- a description of the issue
- steps to reproduce it
- affected versions
- any proposed remediation or fix

If you are unsure whether the issue is in scope, send the report anyway and the maintainers will triage it.

## Response timeline

- Acknowledge receipt within 72 hours
- Provide an initial assessment within 7 days
- Coordinate disclosure after a fix is available

## Scope

In scope:

- Electron main-process and renderer isolation bypasses
- IPC surface weaknesses or unsafe exposure of privileged APIs
- Unsafe handling of user-provided project or media files (`.swproj`, `.docx`, `.txt`)
- Credential-storage weaknesses or unintended leakage of local configuration data

Out of scope:

- Issues in third-party AI providers
- Issues requiring a compromised local machine
- Social-engineering attacks or user-account compromise outside the app itself

## Handling of API keys

The app stores API keys locally on the machine. On every platform where Electron reports `safeStorage.isEncryptionAvailable()` (macOS Keychain, Windows DPAPI, Linux with a keyring), the settings payload — including the keys — is encrypted with OS-backed key material before it is written to disk. Where no OS-backed protection exists, the settings are kept in the local Electron store with its built-in obfuscation instead, so the app still works.

Keys stay in the main process: the renderer sends the conversation, and main attaches the key when it calls the provider. Settings expose only a `hasApiKey` flag, so a compromised page cannot read the key back out.

This is not the same as a managed cloud secret vault and cannot fully protect against a determined attacker with direct access to the local machine.

Keys are only transmitted to the provider selected in the app configuration and are not sent to a separate project service by default.

## Security hardening

The desktop app applies the Electron security checklist:

- `contextIsolation: true`, `nodeIntegration: false` and `sandbox: true` for every window; the preload script (CommonJS) exposes a narrow, `invoke`-only API through `contextBridge`.
- A strict Content-Security-Policy (`default-src 'self'`, `script-src 'self'`, `object-src 'none'`) in `src/index.html`, so remote code and inline handlers cannot execute.
- Navigation away from the app is blocked, external links open in the user's browser, `window.open` is denied, `<webview>` attachment is refused and permissions are limited to the app's own pages (microphone for rehearsal, clipboard for copying chapters).
- IPC payloads are validated: ids are restricted to safe characters and resolved inside the app's data directory, `.swproj` writes are limited to paths the user selected in this session, and payload sizes are capped.
- HTML from `.swproj` files, imported `.docx`/`.txt` documents and AI responses is allow-list sanitized (DOMPurify) before it is stored or rendered, so a crafted file cannot execute script in the renderer.
- Project data, drafts, recordings and exports are written atomically (temporary file + rename) so interrupted writes cannot corrupt existing files.
- Exported CSV cells are neutralized against spreadsheet formula injection.

## Release signing (macOS)

`hardenedRuntime` is enabled with the entitlements in `build/entitlements.mac.plist` (JIT for V8, microphone for rehearsal, outbound network for AI providers). Builds are signed and notarized automatically when the standard electron-builder credentials are present in the environment:

- `CSC_LINK` / `CSC_KEY_PASSWORD` (or a `Developer ID Application` certificate in the keychain)
- `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` — or `APPLE_API_KEY`, `APPLE_API_KEY_ID`, `APPLE_API_ISSUER`

Without credentials the build still succeeds and is left unsigned; note that an unsigned hardened-runtime build cannot be redistributed to end users without Gatekeeper warnings.

