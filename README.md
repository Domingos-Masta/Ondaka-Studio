# Ondaka Studio

Pre-production scripting for YouTube creators.

[![License: GPL v2](https://img.shields.io/badge/License-GPLv2-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/Node-%5E22.22.3%20%7C%5E24.15.0%20%7C%3E%3D26.0.0-22%2F24-0ea5e9)](package.json)
[![Angular](https://img.shields.io/badge/Angular-22-0F172A)](https://angular.io/)
[![Electron](https://img.shields.io/badge/Electron-44-47848f)](https://www.electronjs.org/)

## What it is

Ondaka Studio is a desktop application for planning, scripting, timing, and rehearsing YouTube videos before editing begins. It is built for creators working in a structured pre-production workflow, from scene planning through timed script delivery and export.

The app keeps the process centered on the script: outline the video, write scenes, set a target pace, rehearse with timing cues, and export a production-ready plan for the edit.

## What it is not

Ondaka Studio is not a video editor, not a DAW, and not a media management tool. It does not handle color grading, audio mixing, rendering, or NLE-style editing workflows. Final editing is expected to happen in DaVinci Resolve, Final Cut Pro, or a similar application.

## Screenshots

<!-- TODO: add screenshot -->

- Main script planning view showing the scene list, structure, and content editor.
- Timing/timeline view with target WPM and scene duration information.
- Rehearsal view with recording controls and take management.
- Teleprompter view in sequence or timed mode.

## Feature overview

### Planning

- Build a video structure from hook to intro, body, and CTA.
- Organize scenes and group them into logical blocks.
- Reorder scenes to test pacing and narrative flow.
- Keep a single source of truth for script structure before editorial work begins.

### Scripting

- Draft scripts directly in the built-in editor.
- Assign timing and scene metadata to each segment.
- Adjust content and structure without leaving the production workflow.

### Timing

- Set a target words-per-minute rate for the script.
- Fit script to time or time to script.
- Check pacing against planned scene durations.
- Review timed scene plans before rehearsal.

### Rehearsal

- Record spoken takes against the script.
- Manage multiple takes for a scene or block.
- Rehearse with timing cues and presenter feedback.
- Capture the final delivery approach before post-production.

### Presenter

- Run a teleprompter in sequence or timed mode.
- Keep the presenter on pace with structured cues.
- Use the app as a rehearsal and performance aid during live or recorded delivery.

### Export

- Export timed scene plans.
- Generate YouTube chapter lists.
- Export CSV and PDF outputs.
- Share structured script timing information with the editing workflow.

### AI

AI features are optional and require the user to provide their own provider key.

- Title-to-script generation
- Selection rewrite
- TXT and DOCX import adaptation
- Multi-provider support for OpenAI, Gemini, DeepSeek, Anthropic, and custom OpenAI-compatible endpoints

## Installation

### Prerequisites

- Node.js 22.22.3 or newer, as declared in the package engine range (`^22.22.3 || ^24.15.0 || >=26.0.0`)
- npm, which comes with Node.js
- macOS, Windows, or Linux. The Electron builder configuration targets these platforms.

### From source

```bash
git clone <repository-url>
cd ondaka-studio
npm install
npm start
```

Use the development scripts defined in `package.json` when working locally:

```bash
npm run electron:serve
npm run electron:build
npm run electron:build-win
npm run electron:build-lnx
```

### Prebuilt binaries

<!-- TODO: replace with the actual GitHub repository once published -->
Release binaries are published in the GitHub Releases page:

https://github.com/<owner>/<repo>/releases

## Configuration

### Project file format

Ondaka Studio stores project data as JSON inside a `.swproj` file. The project format is local to the app and is designed to preserve the script, scene structure, timing information, and rehearsal metadata in a single file.

### Where settings are stored

Application settings and local project state are stored under Electron's `app.getPath('userData')` directory.

- macOS: `~/Library/Application Support/ondaka-studio`
- Windows: `%APPDATA%\ondaka-studio`
- Linux: `~/.config/ondaka-studio`

If the app is configured to use `safeStorage`, API keys may be protected by the operating system keychain or equivalent secure storage. Otherwise, the app may rely on local encryption settings provided by Electron store configuration; this is still a local-device protection model and not a substitute for a remote secret store.

API keys are stored locally on the machine and are only sent to the provider selected in the app configuration.

## Usage

A typical workflow is:

1. Create a new project.
2. Add and organize scenes into a structure.
3. Write the script for each scene.
4. Set a target WPM and adjust timing.
5. Rehearse with takes and recording tools.
6. Export the timed plan, chapter list, or PDF/CSV output.

This keeps the work focused on pre-production planning before editing begins.

## AI providers

The app supports multiple provider types for optional AI-assisted scripting.

| Provider | Default base URL | Notes |
| --- | --- | --- |
| OpenAI | `https://api.openai.com/v1` | Standard OpenAI-compatible API access |
| Gemini | `https://generativelanguage.googleapis.com/v1beta/openai` | Google-compatible endpoint |
| DeepSeek | `https://api.deepseek.com` | OpenAI-compatible API style |
| Anthropic | `https://api.anthropic.com` | Native Anthropic endpoint |
| Custom OpenAI-compatible | `https://example.com/v1` | Any compatible endpoint can be configured |

Any OpenAI-compatible endpoint can be used as long as the base URL and model configuration match the provider's API requirements.

## Project structure

```text
src/
  app/
    ai/
      adapters/
      prompts/
    components/
    models/
    services/
  main.ts
  preload.ts
app/
  main.ts
  preload.ts
angular.json
package.json
tsconfig.json
```

- `src/app` contains the Angular renderer application.
- `src/app/ai` contains provider adapters and prompts for optional AI assistance.
- `app/` contains the Electron main process and preload bridge.
- `angular.json` and `tsconfig.json` configure the Angular build.
- `package.json` contains the app metadata, scripts, and dependency versions.

## Roadmap

- Scene blocks are in place and considered part of the current workflow.
- Planned: more granular export presets for chapter, script, and timing outputs.
- Planned: additional import conversions and cleanup flows for source material.
- Planned: more robust take management and rehearsal analytics.
- Planned: additional provider adapters and improved configuration validation for AI endpoints.
- Planned: improvements to teleprompter controls and pace warnings during live rehearsal.

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) for setup steps, conventions, and the pull request process.

## License

This project is licensed under the GNU General Public License, version 2.0. See [LICENSE](LICENSE) for the full terms.

Copyright (C) 2025 <PROJECT OWNER> — see AUTHORS.md

## Acknowledgements

This project relies on or incorporates work from several technologies and libraries, including:

- Angular
- Electron
- Tailwind CSS
- ProseMirror / Domtorial-style editing primitives as used in the project UI
- Mammoth for DOCX import handling
- jsPDF for PDF export generation
- TypeScript and the modern Node.js toolchain
