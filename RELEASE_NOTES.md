# Ondaka Studio 1.0.7

## Overview

This release centers on the project workflow: a richer New Project experience with content categories, video orientation and custom durations, reusable scene templates, one-click scene deletion, over-limit warnings, and a Recent Projects list in the File menu.

## Highlights

### New Project dialog

- Choose to start from scratch or from a template.
- Content categories: Reels, Stories, YouTube Series, or Others (with a custom duration limit).
- Video orientation: landscape, portrait, or square.

### Templates

- Four built-in templates — YouTube Video, Instagram Reels, TikTok Video, and YouTube Short — each with empty scenes and a description explaining every scene's purpose.
- Save the current project as a reusable template; scene titles, roles and notes are captured.
- Templates persist locally and appear alongside the built-in ones in the New Project dialog.

### Duration limits & warnings

- Each category sets a recommended duration, which drives a word budget for the whole video.
- The timing panel shows words and time against the limit and turns red with a warning when the script runs over.
- The timeline strip totals turn red when the script exceeds the recommended limit.

### Scene management

- Delete a scene (or a block's scene) directly from the scene list; block membership is cleaned up automatically.

### Recent projects

- The File menu lists the last 10 opened projects for one-click reopening, with a Clear Recent option.

## Fixed issues

- The scene delete button no longer overlaps the scene timing information.

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
