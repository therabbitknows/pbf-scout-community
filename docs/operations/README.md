# PBF Scout Community Public Operations Index

- Status: `PENDING REVIEW`
- Owner: PBF Scout / Wearables
- Audience: contributors and approved operators
- Source base revision: `ce79770`
- Last verified: 2026-09-20 against `origin/main`
- Reviewed revision: `PENDING` until the approved merge revision is recorded

This public repository is canonical only for its public community-app surface.
Private operational records stay in their respective private GitHub
repositories. NotebookLM may use public-safe content or a separately approved,
redacted, product-specific snapshot; it does not become authority. GitBook work
is stopped unless explicitly reauthorized.

## Minimal handbook pages

1. Start here and public boundary — `AGENTS.md`, `README.md`, and this page.
2. Capture and provider behavior — the architecture and provider sections of
   `README.md`.
3. Voice bridge — `docs/R1_MENTRA_VOICE_BRIDGE.md`.
4. Security, release, and recovery — `SECURITY.md`, `CONTRIBUTING.md`, and the
   repository release history.

This app owns a user-configured Mentra community service. It has no authority
over private hosted services, the R1 Creation, private gateways, Discord
destinations, OddCor inventory, purchases, pricing, Stripe, or fulfillment.
Camera and voice actions remain explicit and bounded; private captures and
transcripts must not enter commits or logs.

Before any NotebookLM use, approve a manifest containing the product name,
source repository, immutable Git revision, exact public-safe included paths,
export date, redaction reviewer role, file count, and SHA-256 checksum for every
file. Never mix private sources into a public notebook or repository.
Acceptance requires diff review, a clean secret-pattern scan, and independent
confirmation that the public/private boundary did not expand. Before merge,
close the PR to roll back; after merge, revert through a reviewed PR.
