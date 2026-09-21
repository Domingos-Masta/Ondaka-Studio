# Ondaka Studio 1.0.6

## Overview

This release focuses on the editing and organizing experience: full-featured tables and richer text in the script editor, in-place scene and block reordering, production notes for scenes and blocks, rich content in presenter mode, and opening `.swproj` projects directly from the operating system.

## Highlights

### Script editor

- Insert tables (preset sizes or custom) and edit them in place with a floating toolbar: add/remove rows and columns, merge/split cells, and delete the table.
- Drag column edges to resize columns; Tab/Shift-Tab navigate cells.
- Rich text toolbar additions: highlight, subscript, superscript, text alignment, text color, background color, font family, font size, line height, invisible characters, and clear formatting.
- Inline images and collapsible "details" blocks.

### Organizing scenes

- Reorder blocks with up/down controls and reorder scenes inside a block.
- Drag scenes between blocks, or out of a block to ungroup them.
- Scene order stays consistent with the scene list after any reorder, keeping selection and navigation reliable.

### Notes

- Add notes to scenes and blocks from the right panel — ideal for camera movements, effects, and other production details.

### Presenting

- Presenter mode now renders rich content (tables, images, blockquotes, and code blocks) instead of plain text.

### Project files

- `.swproj` projects can be opened from Finder/Explorer via double-click or "Open with", including while the app is already running.

## Fixed issues

- Editor disappearing when side panels were collapsed.
- Frozen drag ghost element and inconsistent scene selection after drag and drop.
- Table row/column operations crashing on invalid selections.
- Tables missing from Continuous view and presenter mode.
- Column resizing computing zero-width tables.

## Notes

- Ondaka Studio is intended for pre-production scripting and rehearsal, not final editing.
- AI features are optional and require the user to provide their own provider configuration and key.
- Project data is stored locally under the app’s user-data directory.

## Compatibility

- Angular 22
- Electron 44
- macOS, Windows, and Linux build targets

## Upgrade guidance

If you are updating from an earlier build, open existing project files and confirm the timing and export settings before final delivery work.

## Known limitations

- The `.swproj` file association is registered when the app is installed from a packaged build; it is not available when running from the development server.
- AI integrations depend on user-managed provider credentials and endpoint configuration.
- Export and chapter tools are intended to support the edit workflow, not replace the edit environment itself.
