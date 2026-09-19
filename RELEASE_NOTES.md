# ScriptWriter Pro 1.0.3

## Overview

This release focuses on the project’s core pre-production workflow: planning scenes, writing scripts, setting timing against a target WPM, rehearsing delivery, and exporting structured output for the edit.

It also includes a more complete settings and AI configuration flow, clearer project persistence, and a set of fixes aimed at improving the stability of the editor, scene selection, and export preview tasks.

## Highlights

### Planning and structure

- Scene-based project planning with block organization
- Structured video flow from hook to intro, body, and CTA
- Scene reordering and grouping for pacing review

### Scripting and timing

- In-app script writing with scene metadata
- Target pacing controls based on words per minute
- Fit-to-time and time-to-script adjustments
- Timed scene plan view for export and rehearsal

### Rehearsal and presenter workflow

- Take management for script delivery
- Recording support during rehearsal
- Teleprompter support in sequence and timed modes
- Presenter flow improvements for consistent rehearsal usage

### Export and collaboration

- Timed scene plan export
- YouTube chapter export support
- CSV and PDF export options
- Project save/save-as/open support with `.swproj` persistence

### Optional AI assistance

- OpenAI support
- Gemini support
- DeepSeek support
- Anthropic support
- Custom OpenAI-compatible endpoints
- Title-to-script, selection rewrite, and import adaptation flows

## Fixed issues

- Resolved blank-page behavior after build
- Fixed scene panel selection issues
- Corrected Present button behavior in rehearsal flow
- Fixed chapter preview generation
- Fixed Save, Save As, and Open flows
- Improved `.swproj` compatibility and format handling
- Corrected editor layout and panel alignment issues

## Notes

- ScriptWriter Pro is intended for pre-production scripting and rehearsal, not final editing.
- AI features are optional and require the user to provide their own provider configuration and key.
- Project data is stored locally under the app’s user-data directory.

## Compatibility

- Angular 22
- Electron 44
- Node.js engine range supported by the project configuration
- macOS, Windows, and Linux build targets

## Upgrade guidance

If you are updating from an earlier build, open existing project files in the app and confirm the timing and export settings before final delivery work.

## Known limitations

- This release continues to target early-stage pre-production workflows rather than a full NLE-style production tool.
- AI integrations depend on user-managed provider credentials and endpoint configuration.
- Export and chapter tools are intended to support the edit workflow, not replace the edit environment itself.
