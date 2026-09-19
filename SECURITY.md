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

The app stores API keys locally on the machine. If the project uses Electron `safeStorage`, OS-backed secure storage is used for key material when available. If not, local configuration may rely on the Electron store encryption key or equivalent local protection. This is not the same as a managed cloud secret vault and cannot fully protect against a determined attacker with direct access to the local machine.

Keys are only transmitted to the provider selected in the app configuration and are not sent to a separate project service by default.
