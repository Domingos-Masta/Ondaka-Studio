# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
