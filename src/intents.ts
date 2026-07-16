export type ScoutIntent =
  | { kind: "capture-card" }
  | { kind: "publish-discord" }
  | { kind: "confirm-publish" }
  | { kind: "cancel-publish" }
  | { kind: "inventory-search"; query: string }
  | { kind: "none" };

const normalize = (value: string): string => value.replace(/\s+/g, " ").trim().slice(0, 300);

export function parseIntent(raw: string): ScoutIntent {
  const text = normalize(raw);
  if (!text) return { kind: "none" };
  if (/^(?:hey\s+)?scout[,:\s-]+(?:this|the)\s+card[.!?]*$/i.test(text)) {
    return { kind: "capture-card" };
  }
  if (/^(?:scout[,:\s-]+)?(?:publish|send|post)\s+(?:this|the|current)\s+(?:finding|result)\s+(?:to|on)\s+discord[.!?]*$/i.test(text)) {
    return { kind: "publish-discord" };
  }
  if (/^(?:yes[,]?\s+)?confirm\s+publish(?:\s+to\s+discord)?[.!?]*$/i.test(text)) {
    return { kind: "confirm-publish" };
  }
  if (/^(?:cancel\s+publish|cancel\s+discord|never\s*mind)[.!?]*$/i.test(text)) {
    return { kind: "cancel-publish" };
  }
  const inventory = text.match(/^(?:scout[,:\s-]+)?(?:search|check|find)\s+(?:my\s+)?inventory\s+(?:for\s+)?(.+)$/i);
  if (inventory?.[1]) return { kind: "inventory-search", query: inventory[1].trim().slice(0, 120) };
  return { kind: "none" };
}
