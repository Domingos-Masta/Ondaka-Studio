# Contributing

## Welcome

Contributions are welcome for bug fixes, documentation, tests, and small feature work. Ondaka Studio is a small, focused desktop app, so the most useful changes are the ones that align with the project’s existing workflow and keep the application easy to maintain.

## Code of Conduct

Please review the project [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

## Ways to contribute

- Report bugs and edge cases
- Improve documentation or onboarding
- Add or update translations
- Add test coverage where it helps catch regressions
- Propose a focused feature or workflow improvement

## Before you start

- Search the existing issues before creating a new one.
- Open an issue before starting a large change or a cross-cutting refactor.
- Discuss design changes or workflow changes before coding if they are likely to alter the product direction.

## Development setup

From a clean checkout:

```bash
npm install
npm start
npm run electron:serve
npm run electron:build
npm run electron:build-win
npm run electron:build-lnx
```

Use the package scripts defined in `package.json` instead of creating new wrapper commands unless a change is required by the project itself.

## Project conventions

- TypeScript strict mode is required.
- Angular signals are the preferred state primitive. Do not introduce NgRx or similar state-management libraries without prior discussion.
- Electron security is a project requirement: `contextIsolation: true` and `nodeIntegration: false`. Every new IPC channel must be exposed through `preload.ts` with a narrow, typed surface. Do not enable `nodeIntegration`.
- Styling uses Tailwind utility classes. Avoid ad-hoc CSS files unless there is a strong justification.
- File naming uses kebab-case for files and PascalCase for classes.
- Commits use Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`.
- Branches use the naming pattern `feat/<short-name>`, `fix/<short-name>`, `docs/<short-name>`.

## Pull request process

- Keep PRs small and focused on one concern at a time.
- Link the issue or discussion in the PR description.
- Include screenshots or GIFs for UI changes.
- Ensure the relevant build and validation steps pass before requesting review.

## Reporting bugs

Use the bug report template here:

- [.github/ISSUE_TEMPLATE/bug_report.yml](.github/ISSUE_TEMPLATE/bug_report.yml)

## Requesting features

Use the feature request template here:

- [.github/ISSUE_TEMPLATE/feature_request.yml](.github/ISSUE_TEMPLATE/feature_request.yml)

## Security issues

Do not file a public issue for a security problem. Follow the instructions in [SECURITY.md](SECURITY.md).

## Licensing of contributions

By submitting a pull request, you agree that your contribution is licensed under GPL v2 and that the inbound contribution is intended to be under the same terms as the project’s open source license. This repository does not require a CLA.
