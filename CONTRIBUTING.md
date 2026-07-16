# Contributing

Thank you for helping improve user-controlled smart-glasses tooling.

## Ground Rules

- Keep external connectors disabled by default.
- Never add private endpoints, accounts, webhooks, datasets, captures, or keys.
- Camera, microphone, publishing, and inventory mutations require explicit user action.
- Do not log transcripts, prompts, model answers, frames, audio, or secrets.
- Add tests for command parsing, provider failures, and exactly-once actions.
- Describe every new network destination and why it is required.

## Workflow

1. Fork the repository and create a focused branch.
2. Add or update tests with the implementation.
3. Run `npm run check`.
4. Open a pull request describing privacy and network-surface changes.

Contributions are submitted under Apache-2.0. Contributors retain ownership of
their work while granting the project the rights provided by that license.
