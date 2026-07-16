import { readFile } from "node:fs/promises";

export type InventoryItem = {
  id: string;
  title: string;
  notes?: string;
  available?: boolean;
};

export async function searchInventory(path: string, query: string): Promise<InventoryItem[]> {
  if (!path) return [];
  const parsed = JSON.parse(await readFile(path, "utf8")) as unknown;
  if (!Array.isArray(parsed)) throw new Error("inventory must be a JSON array");
  const needle = query.toLowerCase();
  return parsed
    .filter((item): item is InventoryItem => Boolean(
      item && typeof item === "object" &&
      typeof (item as InventoryItem).id === "string" &&
      typeof (item as InventoryItem).title === "string",
    ))
    .filter((item) => item.available !== false)
    .filter((item) => `${item.title} ${item.notes || ""}`.toLowerCase().includes(needle))
    .slice(0, 5)
    .map(({ id, title, notes, available }) => ({
      id,
      title,
      ...(notes ? { notes } : {}),
      ...(typeof available === "boolean" ? { available } : {}),
    }));
}
