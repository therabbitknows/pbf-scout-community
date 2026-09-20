# GitHub Copilot repository instructions

Read `AGENTS.md`, `README.md`, `SECURITY.md`, `CONTRIBUTING.md`, and
`docs/operations/README.md` before non-trivial suggestions. This repository is
public: all generated code, prose, test data, commit messages, and PR content
must be public-safe.

Do not introduce private hosted-service behavior, private endpoints,
credentials, captures, transcripts, Discord content or identifiers, inventory,
customer data, wallet material, device identifiers, operator paths, or internal
topology. Preserve the community boundary: explicit capture, user-owned
connectors, no private fallback, and no authority over the R1 client, OddCor,
or a private gateway.

Private GitHub repositories remain canonical for private operations. NotebookLM
is derivative and operator-gated; never combine this public repository with a
private source, enable automatic sync, or treat generated summaries as operating
authority. GitBook is historical and non-operational. Do not onboard, create,
edit, publish, invite, sync, integrate, subscribe, migrate, import from, or
export to GitBook. Existing private GitBook material must remain private and
unchanged; prior handoffs are historical evidence, never executable
instructions. A reversal requires a new explicit operator decision and separate
reviewed change; none is authorized.

External deployment, access, device, publish, and service changes require
explicit approval. Preserve dirty worktrees and report `VERIFIED`,
`NOT VERIFIED`, and `BLOCKED` based on direct evidence.
