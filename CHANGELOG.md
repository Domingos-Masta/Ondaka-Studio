# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Multiple open scripts in tabs. Every tab is a complete workspace with its own scenes, editor, file path, unsaved-changes indicator and selected scene; closing a tab with unsaved work asks first, and the last tab is always replaced by a fresh one.
- Tab menu actions and shortcuts: New Tab (⌘/Ctrl+T), Close Tab (⌘/Ctrl+W), Close Window (⇧⌘/Ctrl+W), and Next/Previous Tab (Ctrl+Tab / Ctrl+Shift+Tab).
- Opening a `.swproj` (from the toolbar, the File menu, a recent file or a double-click) now opens it in its own tab instead of replacing the current script.

### Security

- Added a strict Content-Security-Policy to the renderer, so only the app's own scripts can run. Critical-CSS inlining is disabled so production stylesheets load without inline handlers under that policy.
- Enabled the Chromium renderer sandbox (`sandbox: true`) and moved the preload script to CommonJS so it can run inside it.
- Blocked navigation away from the app, denied `window.open`/`<webview>` and restricted permissions to the app's own pages (microphone and clipboard only).
- Validated every IPC payload: project/take ids can no longer traverse outside the app's data directory, and `.swproj` files can only be written to a path the user picked in this session.
- Script HTML coming from `.swproj` files, imported documents or AI output is now sanitized against an allow-list before it is rendered or stored.
- AI provider calls now run in the main process: the renderer sends the conversation and never receives the API key (`hasApiKey` tells the settings UI a key is stored). The settings dialog can still replace or remove a key.
- Provider API keys are encrypted at rest with Electron `safeStorage` (OS keychain) when available, keeping existing settings readable on upgrade.
- Exported CSV cells can no longer be interpreted as spreadsheet formulas.
- Removed the unused renderer service that called `window.require('fs')` / `child_process.exec`.
- macOS builds enable the hardened runtime with explicit entitlements (`build/entitlements.mac.plist`) and are ready for notarization once signing credentials are provided.

### Fixed

- Draft autosave now actually runs — the previous bootstrap provider never created the service — and it follows the Autosave setting (`enabled` / `debounceMs`), backing up every open tab rather than only the current one.
- Project files, drafts, recordings and exports are written through a temporary file and renamed into place, and draft writes are serialized, so an interrupted or overlapping write can no longer leave a half-written (unreadable) file behind.
- Editing the project title no longer throws inside the toolbar's two-way binding.
- The script editor no longer writes into a destroyed editor instance when the workspace is swapped (for example switching to an empty tab), which surfaced as a ProseMirror `matchesNode` error.
- `updatedAt` is now strictly increasing, so two edits in the same millisecond are no longer treated as a single change.

## [1.0.7] - 2026-09-22

### Added

- Delete a scene directly from the scene list, including scenes inside a block.
- New Project dialog with content categories (Reels, Stories, YouTube Series, Others) and a recommended duration/word limit per category.
- "Others" category with a custom duration limit, plus video orientation (landscape / portrait / square).
- Project templates: four built-in categories (YouTube Video, Instagram Reels, TikTok Video, YouTube Short) with empty scenes and per-scene purpose descriptions, plus saving the current project as a reusable template.
- Recent files in the File menu (last 10 opened projects) with a clear option.
- Over-limit warning (red) in the timing panel and timeline when the script exceeds the recommended duration for the project category.

### Fixed

- Scene delete button no longer overlaps the scene timing information.

## [1.0.6] - 2026-09-21

### Added

- Tables in the script editor with in-page row/column editing and drag-to-resize columns.
- Inline images and collapsible details blocks.
- Rich text toolbar options: highlight, subscript/superscript, text alignment, colors, font family/size, line height, invisible characters, and clear formatting.
- Scene and block notes in the right panel (camera movements, effects, details).
- `.swproj` file association so projects can be opened from the OS.

### Changed

- Presenter mode now renders rich content (tables, images, blockquotes, code blocks).
- Scene list drag & drop: reorder blocks and scenes, and move scenes between blocks.

### Fixed

- Editor disappearing when side panels were collapsed.
- Frozen drag ghost element and inconsistent scene selection after dragging scenes.
- Table row/column operations crashing on invalid selections.
- Tables missing from Continuous view and presenter mode.

## [1.0.3]

### Added

- Scene blocks for structured video planning and grouping.
- Settings page for user preferences and local configuration.
- Multi-provider AI assistance with OpenAI, Gemini, DeepSeek, Anthropic, and custom OpenAI-compatible endpoints.
- Selection rewrite and title-to-script workflows.
- TXT and DOCX import adaptation support.
- Project save, save-as, open, and `.swproj` persistence flows.
- Chapter preview generation and export support.

### Changed

- Improved editor layout and scene panel interactions.
- Clarified the core planning-to-export workflow for scripts and timing.
- Updated rehearsal and presenter flows for timed teleprompter use.
- Improved configuration handling for local application settings and AI provider setup.

### Fixed

- Blank page after build.
- Scene panel selection issues.
- Present button behavior during rehearsal flow.
- Chapters preview generation.
- Save, Save As, and Open workflows.
- `.swproj` file compatibility and format handling.
- Editor layout and panel alignment issues.
