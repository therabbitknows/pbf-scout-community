import { randomUUID } from "node:crypto";

export type DiscordFinding = {
  identity: string;
  confidence: number;
  details: string;
  servedBy: string;
};

export function validateDiscordWebhook(raw: string): URL {
  const url = new URL(raw);
  if (url.protocol !== "https:" || !["discord.com", "discordapp.com"].includes(url.hostname)) {
    throw new Error("Discord webhook must use an official HTTPS host");
  }
  if (!/^\/api\/webhooks\/\d+\/[A-Za-z0-9._-]+$/.test(url.pathname)) {
    throw new Error("Discord webhook path is invalid");
  }
  url.searchParams.set("wait", "true");
  return url;
}

export async function publishFinding(rawWebhook: string, finding: DiscordFinding): Promise<string> {
  const url = validateDiscordWebhook(rawWebhook);
  const requestId = randomUUID();
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": requestId },
    body: JSON.stringify({
      username: "Scout Community",
      content: [
        "**Confirmed scouting finding**",
        finding.identity,
        `Confidence: ${Math.round(finding.confidence * 100)}%`,
        finding.details ? `Visible clues: ${finding.details}` : "",
        `Model: ${finding.servedBy}`,
        "Operator review required. No price is implied.",
      ].filter(Boolean).join("\n"),
      allowed_mentions: { parse: [] },
    }),
  });
  if (!response.ok) throw new Error(`Discord publish HTTP ${response.status}`);
  const payload = await response.json() as { id?: string };
  if (!payload.id) throw new Error("Discord did not confirm the message");
  return payload.id;
}
