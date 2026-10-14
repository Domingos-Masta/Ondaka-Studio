# Ondaka Studio 1.0.8

## Overview

This release is about working on more than one script at a time and about hardening the desktop shell. Every script opens in its own tab, and the renderer now runs sandboxed behind a strict Content-Security-Policy with validated IPC, sanitized script HTML and provider API keys that never leave the main process.

## Highlights

### Multiple open scripts (tabs)

- Open several scripts at once; each tab keeps its own scenes, editor state, file path, unsaved-changes indicator and selected scene.
- Closing a tab with unsaved work asks first, and the last tab is always replaced by a fresh one.
- Opening a `.swproj` from the toolbar, the File menu, the Recent list or by double-clicking it in the OS opens it in its own tab instead of replacing the current script.
- Tab menu actions and shortcuts: New Tab (⌘/Ctrl+T), Close Tab (⌘/Ctrl+W), Close Window (⇧⌘/Ctrl+W), and Next/Previous Tab (Ctrl+Tab / Ctrl+Shift+Tab).

### Security hardening

- Strict Content-Security-Policy in the renderer, so only the app's own scripts can run; critical-CSS inlining is disabled so production stylesheets load without inline handlers under that policy.
- Chromium renderer sandbox enabled (`sandbox: true`), with the preload script moved to CommonJS so it can run inside it.
- Navigation away from the app is blocked, `window.open`/`<webview>` are denied, and permissions are limited to the app's own pages (microphone and clipboard only).
- Every IPC payload is validated: project/take ids can no longer traverse outside the app's data directory, and `.swproj` files can only be written to a path the user picked in this session.
- Script HTML coming from `.swproj` files, imported documents or AI output is sanitized against an allow-list before it is rendered or stored.
- AI provider calls now run in the main process — the renderer sends the conversation and never receives the API key, while the settings dialog can still replace or remove a stored key.
- Provider API keys are encrypted at rest with Electron `safeStorage` (OS keychain) where available, and existing settings stay readable after upgrade.
- Exported CSV cells can no longer be interpreted as spreadsheet formulas.
- macOS builds enable the hardened runtime with explicit entitlements and are ready for notarization once signing credentials are provided.

## Fixed issues

- Draft autosave now actually runs, follows the Autosave setting (`enabled` / `debounceMs`), and backs up every open tab rather than only the current one.
- Project files, drafts, recordings and exports are written through a temporary file and renamed into place, and draft writes are serialized, so an interrupted or overlapping write can no longer leave a half-written (unreadable) file behind.
- Editing the project title no longer throws inside the toolbar's two-way binding.
- The script editor no longer writes into a destroyed editor instance when the workspace is swapped (for example switching to an empty tab).
- `updatedAt` is now strictly increasing, so two edits in the same millisecond are no longer treated as a single change.

## Notes

- Ondaka Studio is intended for pre-production scripting and rehearsal, not final editing.
- AI features are optional and require the user to provide their own provider configuration and key.
- Project data is stored locally under the app’s user-data directory.

## Compatibility

- Angular 22
- Electron 44
- macOS, Windows, and Linux build targets

## Upgrade guidance

If you are updating from an earlier build, existing projects, templates and the recent-files list are picked up unchanged, and drafts in progress are restored per tab. Provider API keys stored by an older build are migrated on first launch and can be replaced or removed from the settings dialog.

## Known limitations

- The `.swproj` file association is registered when the app is installed from a packaged build; it is not available when running from the development server.
- AI integrations depend on user-managed provider credentials and endpoint configuration.
- Export and chapter tools are intended to support the edit workflow, not replace the edit environment itself.
- macOS builds are not notarized yet; signed builds require the project's signing credentials.
