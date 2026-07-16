import assert from "node:assert/strict";
import test from "node:test";
import { parseIntent } from "./intents.js";

test("capture requires an explicit card instruction", () => {
  assert.deepEqual(parseIntent("Scout this card"), { kind: "capture-card" });
  assert.deepEqual(parseIntent("Hey Scout"), { kind: "none" });
  assert.deepEqual(parseIntent("look around"), { kind: "none" });
});

test("Discord delivery has a separate confirmation", () => {
  assert.deepEqual(parseIntent("Publish this finding to Discord"), { kind: "publish-discord" });
  assert.deepEqual(parseIntent("Confirm publish"), { kind: "confirm-publish" });
  assert.deepEqual(parseIntent("yes"), { kind: "none" });
});

test("inventory search is generic and explicit", () => {
  assert.deepEqual(parseIntent("Search my inventory for Ohtani"), {
    kind: "inventory-search",
    query: "Ohtani",
  });
});
