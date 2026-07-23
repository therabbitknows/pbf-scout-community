import assert from "node:assert/strict";
import test from "node:test";
import { normalizeBridgeText, readBearer, validateRabbitScoutCommand } from "./rabbit-bridge.js";

test("Mentra bridge accepts an explicit identify command", () => {
  assert.deepEqual(validateRabbitScoutCommand({
    request_id: "r1-1",
    action: "scout",
    capture_source: "mentra",
    text: "Identify this collectible",
  }), {
    ok: true,
    requestId: "r1-1",
    text: "Identify this collectible",
  });
});

test("Mentra bridge rejects unsupported or ambiguous commands", () => {
  assert.equal(validateRabbitScoutCommand({ request_id: "r1-1", action: "chat", capture_source: "mentra" }).ok, false);
  assert.equal(validateRabbitScoutCommand({ request_id: "r1-1", action: "scout", capture_source: "r1" }).ok, false);
  assert.equal(validateRabbitScoutCommand({ request_id: "r1-1", action: "scout", capture_source: "mentra", mode: "comps" }).ok, false);
});

test("bridge auth parsing never expands the secret surface", () => {
  assert.equal(readBearer("Bearer token"), "token");
  assert.equal(readBearer("token"), "");
  assert.equal(normalizeBridgeText("  one\n two  ", 20), "one two");
});
