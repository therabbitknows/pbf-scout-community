# PBF Scout Community

A privacy-first reference app for building user-owned collectible scouting
workflows on MentraOS. It captures one card only after an explicit spoken
command, sends the in-memory frame to an operator-configured vision provider,
and returns a concise identity with visible uncertainty.

This repository is the community edition. It contains no access to the PBF
Scout hosted service, private storefronts, private Discord channels, private
datasets, provider credentials, or operator infrastructure.

## What Works

- `Scout this card` performs one explicit Mentra camera capture.
- OpenAI-compatible vision provider support, including self-hosted gateways.
- Duplicate final-transcript suppression while a turn is active.
- User-owned Discord webhook with a separate 30-second confirmation.
- Optional read-only generic JSON inventory search.
- Frames remain in memory and are not saved by this app.
- Logs contain operational metadata, never frames, transcripts, answers, or keys.

## Architecture

```text
Mentra glasses
    ↕ MentraOS session
PBF Scout Community AppServer
    ├── operator-owned vision endpoint
    ├── optional operator-owned Discord webhook
    └── optional local JSON inventory
```

All connectors are disabled until the operator configures them. There are no
PBF endpoints or fallback credentials in the source.

## Quick Start

Requirements: Node.js 20+, a MentraOS developer app, and camera/microphone
permissions declared in the Mentra Developer Console.

```bash
git clone https://github.com/therabbitknows/pbf-scout-community.git
cd pbf-scout-community
npm install
cp .env.example .env
# Add values owned by you to .env
npm run dev
```

Configure your Mentra app's public URL according to the official
[MentraOS deployment guide](https://docs.mentraglass.com/app-devs/getting-started/deployment/overview).

## Provider Setup

The vision adapter uses the OpenAI-compatible `/chat/completions` shape with a
multimodal message. Point it at a vision-capable endpoint you control:

```text
SCOUT_VISION_BASE_URL=http://127.0.0.1:11434/v1
SCOUT_VISION_MODEL=your-vision-model
SCOUT_VISION_API_KEY=
```

A local endpoint must be reachable from the AppServer process. MentraOS Cloud
cannot call a loopback service running on a different machine.

## Optional Discord

Create an incoming webhook in a Discord channel you control and place it only
in the server's private `.env`:

```text
SCOUT_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
SCOUT_DISCORD_CHANNEL_LABEL=#my-scout-findings
```

After a successful capture, say `Publish this finding to Discord`, review the
spoken destination, then say `Confirm publish`. A plain `yes` does not publish.
Messages disable mention parsing and contain text only.

## Optional Inventory

Copy `examples/inventory.example.json` outside the repository, replace it with
your records, and set `SCOUT_INVENTORY_PATH`. Search with `Search my inventory
for ...`. The adapter is read-only and returns only records where `available`
is not false.

## Security and Privacy

- Never commit `.env`, captures, inventory, logs, or provider credentials.
- Do not expose this server without authentication and HTTPS.
- Camera access requires an explicit card instruction.
- Raw frames are not written to disk by the reference implementation.
- AI output is uncertain and is not a valuation, authentication, or purchase recommendation.
- Follow local recording, privacy, venue, and platform rules.

Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## Community and Commercial Boundary

The Apache-2.0 code may be used, modified, and redistributed under its license.
The PBF Scout name and artwork are not granted for modified distributions; see
[TRADEMARKS.md](TRADEMARKS.md). A separately operated hosted service may offer
managed authentication, models, updates, and connectors in the future, but is
not required to use this community edition.

## Contributing

Issues and focused pull requests are welcome. Start with
[CONTRIBUTING.md](CONTRIBUTING.md), and run `npm run check` before opening a PR.

## License

Apache License 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
