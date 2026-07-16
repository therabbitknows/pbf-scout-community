import assert from "node:assert/strict";
import test from "node:test";
import { validateDiscordWebhook } from "./discord.js";

test("Discord webhook validation permits only official webhook paths", () => {
  assert.equal(
    validateDiscordWebhook("https://discord.com/api/webhooks/1234567890/token_value").hostname,
    "discord.com",
  );
  assert.throws(() => validateDiscordWebhook("https://example.com/api/webhooks/123/token"));
  assert.throws(() => validateDiscordWebhook("http://discord.com/api/webhooks/123/token"));
});
