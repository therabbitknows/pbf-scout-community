export type RabbitScoutCommand = {
  request_id?: unknown;
  action?: unknown;
  capture_source?: unknown;
  capture_intent?: unknown;
  text?: unknown;
  mode?: unknown;
  collectible_type?: unknown;
  session_id?: unknown;
  timeout_ms?: unknown;
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

export type ValidatedRabbitCommand = {
  ok: true;
  requestId: string;
  action: "scout" | "listen_once" | "speak";
  text: string;
  sessionId?: string;
  captureIntent?: "pov";
  timeoutMs?: number;
};

export function validateRabbitScoutCommand(body: RabbitScoutCommand): ValidatedRabbitCommand | { ok: false; error: string } {
  const requestId = normalizeBridgeText(body.request_id, 160);
  if (!requestId) return { ok: false, error: "request_id is required" };
  const action = normalizeBridgeText(body.action, 40);
  if (!["scout", "listen_once", "speak"].includes(action)) {
    return { ok: false, error: "Mentra bridge supports scout, listen_once, and speak only" };
  }

  const sessionId = normalizeBridgeText(body.session_id, 160) || undefined;
  if (action === "listen_once") {
    const requestedTimeout = Number(body.timeout_ms ?? 15_000);
    if (!Number.isFinite(requestedTimeout) || requestedTimeout < 3_000 || requestedTimeout > 20_000) {
      return { ok: false, error: "listen_once timeout_ms must be between 3000 and 20000" };
    }
    return {
      ok: true,
      requestId,
      action,
      text: "",
      timeoutMs: Math.round(requestedTimeout),
      ...(sessionId ? { sessionId } : {}),
    };
  }

  if (action === "speak") {
    const text = normalizeBridgeText(body.text, 600);
    if (!text) return { ok: false, error: "speak requires text" };
    return { ok: true, requestId, action, text, ...(sessionId ? { sessionId } : {}) };
  }

  if (normalizeBridgeText(body.capture_source, 40) !== "mentra") return { ok: false, error: "capture_source must be mentra" };
  const captureIntent = normalizeBridgeText(body.capture_intent, 40);
  if (captureIntent && captureIntent !== "pov") return { ok: false, error: "Mentra bridge capture_intent must be pov" };
  const mode = normalizeBridgeText(body.mode, 40) || "identify";
  if (mode !== "identify") return { ok: false, error: "Mentra bridge currently supports identify mode only" };
  return {
    ok: true,
    requestId,
    action: "scout",
    text: normalizeBridgeText(body.text) || "Identify the collectible in this frame.",
    captureIntent: "pov",
    ...(sessionId ? { sessionId } : {}),
  };
}
