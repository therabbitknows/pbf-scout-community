import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { searchInventory } from "./inventory.js";

test("generic inventory search excludes unavailable items", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "scout-inventory-"));
  const file = path.join(dir, "inventory.json");
  await writeFile(file, JSON.stringify([
    { id: "one", title: "Example Player Rookie", available: true },
    { id: "two", title: "Example Player Insert", available: false },
  ]));
  assert.deepEqual(await searchInventory(file, "Example Player"), [
    { id: "one", title: "Example Player Rookie", available: true },
  ]);
});
