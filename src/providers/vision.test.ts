import assert from "node:assert/strict";
import test from "node:test";
import { parseFinding } from "./vision.js";

test("structured card findings parse without price claims", () => {
  const finding = parseFinding(
    "SCOUT_CARD_V1|identity=2024 Example Player #17|confidence=0.88|details=name and card number visible|recapture=none",
    "local-vision",
  );
  assert.equal(finding?.identity, "2024 Example Player #17");
  assert.equal(finding?.confidence, 0.88);
  assert.equal(finding?.recapture, undefined);
});

test("unknown and malformed findings fail closed", () => {
  assert.equal(parseFinding("The image shows a table.", "model"), null);
  assert.equal(parseFinding("SCOUT_CARD_V1|identity=unknown|confidence=0.4|details=blurred|recapture=move closer", "model"), null);
});
