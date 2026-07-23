export type RabbitScoutCommand = {
  request_id?: unknown;
  action?: unknown;
  capture_source?: unknown;
  text?: unknown;
  mode?: unknown;
  collectible_type?: unknown;
  session_id?: unknown;
};

export type RabbitScoutResponse = {
  ok: boolean;
  action?: string;
  text?: string;
  served_by?: string;
  error?: string;
  retryable?: boolean;
};

export function normalizeBridgeText(value: unknown, max = 1200): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function readBearer(value: unknown): string {
  const header = String(value ?? "");
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

export function validateRabbitScoutCommand(body: RabbitScoutCommand): { ok: true; requestId: string; text: string; sessionId?: string } | { ok: false; error: string } {
  const requestId = normalizeBridgeText(body.request_id, 160);
  if (!requestId) return { ok: false, error: "request_id is required" };
  if (normalizeBridgeText(body.action, 40) !== "scout") return { ok: false, error: "only scout is supported on the Mentra bridge" };
  if (normalizeBridgeText(body.capture_source, 40) !== "mentra") return { ok: false, error: "capture_source must be mentra" };
  const mode = normalizeBridgeText(body.mode, 40) || "identify";
  if (mode !== "identify") return { ok: false, error: "Mentra bridge currently supports identify mode only" };
  return {
    ok: true,
    requestId,
    text: normalizeBridgeText(body.text) || "Identify the collectible in this frame.",
    ...(normalizeBridgeText(body.session_id, 160) ? { sessionId: normalizeBridgeText(body.session_id, 160) } : {}),
  };
}
