import "dotenv/config";
import { AppServer, type AppSession } from "@mentra/sdk";
import { publishFinding } from "./connectors/discord.js";
import { parseIntent } from "./intents.js";
import { searchInventory } from "./providers/inventory.js";
import { OpenAiCompatibleVisionProvider, type CardFinding } from "./providers/vision.js";
import {
  normalizeBridgeText,
  readBearer,
  validateRabbitScoutCommand,
  type RabbitScoutCommand,
  type RabbitScoutResponse,
} from "./rabbit-bridge.js";

const PACKAGE_NAME = process.env.MENTRAOS_PACKAGE_NAME?.trim() || "";
const API_KEY = process.env.MENTRAOS_API_KEY?.trim() || "";
const PORT = Number(process.env.PORT || 3000);
const DISCORD_WEBHOOK = process.env.SCOUT_DISCORD_WEBHOOK_URL?.trim() || "";
const DISCORD_LABEL = process.env.SCOUT_DISCORD_CHANNEL_LABEL?.trim() || "configured Discord channel";
const INVENTORY_PATH = process.env.SCOUT_INVENTORY_PATH?.trim() || "";
const R1_BRIDGE_TOKEN = process.env.PBF_R1_BRIDGE_TOKEN?.trim() || "";
const R1_ALLOWED_ORIGIN = process.env.PBF_R1_ALLOWED_ORIGIN?.trim() || "*";
const R1_MENTRA_USER_ID = process.env.PBF_R1_MENTRA_USER_ID?.trim() || "";

const visionBaseUrl = process.env.SCOUT_VISION_BASE_URL?.trim() || "";
const visionModel = process.env.SCOUT_VISION_MODEL?.trim() || "";
const vision = visionBaseUrl && visionModel
  ? new OpenAiCompatibleVisionProvider({
      baseUrl: visionBaseUrl,
      model: visionModel,
      apiKey: process.env.SCOUT_VISION_API_KEY?.trim() || undefined,
      timeoutMs: Number(process.env.SCOUT_VISION_TIMEOUT_MS || 30_000),
    })
  : undefined;

type SessionState = {
  session: AppSession;
  sessionId: string;
  userId: string;
  cleanup: () => void;
  inFlight: boolean;
  latestFinding?: CardFinding;
  publishExpiresAt?: number;
  lastTranscript?: string;
  lastTranscriptAt?: number;
  present: (message: string) => Promise<void>;
};

type CachedResponse = { expiresAt: number; response: RabbitScoutResponse };
type RabbitRequest = { headers: { authorization?: unknown }; body?: unknown };
type RabbitResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => RabbitResponse;
  end: () => void;
  json: (body: unknown) => void;
};

class ScoutCommunityApp extends AppServer {
  private readonly states = new Map<string, SessionState>();
  private readonly commandResults = new Map<string, CachedResponse>();
  private readonly commandPromises = new Map<string, Promise<RabbitScoutResponse>>();

  constructor(config: ConstructorParameters<typeof AppServer>[0]) {
    super(config);
    this.configureRabbitBridge();
  }

  private configureRabbitBridge(): void {
    const expressApp = this.getExpressApp();
    const setCors = (res: RabbitResponse): void => {
      res.setHeader("Access-Control-Allow-Origin", R1_ALLOWED_ORIGIN);
      res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, Idempotency-Key");
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Vary", "Origin");
    };

    expressApp.options("/v1/rabbit/command", (_req: RabbitRequest, res: RabbitResponse) => {
      setCors(res);
      res.status(204).end();
    });

    expressApp.post("/v1/rabbit/command", async (req: RabbitRequest, res: RabbitResponse) => {
      setCors(res);
      if (!R1_BRIDGE_TOKEN) {
        res.status(503).json({ ok: false, error: "R1 bridge is not configured" });
        return;
      }
      if (readBearer(req.headers.authorization) !== R1_BRIDGE_TOKEN) {
        res.status(401).json({ ok: false, error: "unauthorized" });
        return;
      }

      const validation = validateRabbitScoutCommand(req.body as RabbitScoutCommand);
      if (!validation.ok) {
        res.status(400).json({ ok: false, error: validation.error });
        return;
      }

      const now = Date.now();
      const cached = this.commandResults.get(validation.requestId);
      if (cached && cached.expiresAt > now) {
        res.json(cached.response);
        return;
      }
      this.commandResults.delete(validation.requestId);

      const existing = this.commandPromises.get(validation.requestId);
      const work = existing || this.runRabbitScout(validation.requestId, validation.text, validation.sessionId);
      if (!existing) this.commandPromises.set(validation.requestId, work);

      let response: RabbitScoutResponse;
      try {
        response = await work;
      } finally {
        if (!existing) this.commandPromises.delete(validation.requestId);
      }
      this.commandResults.set(validation.requestId, { expiresAt: Date.now() + 10 * 60_000, response });
      res.status(response.ok ? 200 : response.retryable ? 409 : 503).json(response);
    });
  }

  private findSession(sessionId?: string): SessionState | undefined {
    if (sessionId) return this.states.get(sessionId);
    const candidates = [...this.states.values()].filter((state) => !R1_MENTRA_USER_ID || state.userId === R1_MENTRA_USER_ID);
    return candidates.length === 1 ? candidates[0] : undefined;
  }

  private async runRabbitScout(requestId: string, prompt: string, sessionId?: string): Promise<RabbitScoutResponse> {
    const state = this.findSession(sessionId);
    if (!state) {
      return {
        ok: false,
        error: this.states.size > 1 ? "multiple Mentra sessions are active; configure a session_id or PBF_R1_MENTRA_USER_ID" : "no active Mentra Live session",
        retryable: true,
      };
    }
    if (state.inFlight) return { ok: false, error: "Scout is already capturing a frame", retryable: true };
    await state.present("R1 requested Scout");
    const result = await this.runCapture(state, prompt);
    return {
      ...result,
      action: "scout",
      ...(result.ok ? { request_id: requestId } : {}),
    } as RabbitScoutResponse;
  }

  private async runCapture(state: SessionState, _prompt: string): Promise<RabbitScoutResponse> {
    if (!vision) {
      await state.present("A vision provider is not configured for this server.");
      return { ok: false, error: "vision provider is not configured" };
    }
    state.inFlight = true;
    try {
      await state.present("Scanning");
      const photo = await state.session.camera.requestPhoto({
        saveToGallery: false,
        size: "large",
        compress: "medium",
      });
      await state.present("Got it. Identifying");
      const finding = await vision.identify(photo.buffer, photo.mimeType);
      state.latestFinding = finding;
      state.publishExpiresAt = undefined;
      const confidence = Math.round(finding.confidence * 100);
      const text = `Likely ${finding.identity}, ${confidence} percent confidence. Price not verified.`;
      await state.present(text);
      return { ok: true, text, served_by: finding.servedBy };
    } catch (error) {
      const text = error instanceof Error && error.message === "card identity was not confirmed"
        ? "Identity not confirmed. Move closer, center the collectible, and hold it still."
        : "Scout could not complete this capture. Check the provider and try again.";
      state.session.logger.warn("Scout capture failed without storing the frame");
      await state.present(text);
      return { ok: false, error: text, retryable: true };
    } finally {
      state.inFlight = false;
    }
  }

  protected async onSession(session: AppSession, sessionId: string, userId: string): Promise<void> {
    const state = {} as SessionState;
    state.session = session;
    state.sessionId = sessionId;
    state.userId = userId;
    state.cleanup = () => {};
    state.inFlight = false;
    state.present = async (message: string): Promise<void> => {
      if (session.capabilities?.hasDisplay) session.layouts.showTextWall(message);
      try {
        await session.audio.speak(message);
      } catch {
        session.logger.warn("Scout audio response unavailable");
      }
    };
    this.states.set(sessionId, state);

    const handleTranscript = async (raw: string): Promise<void> => {
      const text = raw.replace(/\s+/g, " ").trim().slice(0, 300);
      const now = Date.now();
      if (!text) return;
      if (state.lastTranscript === text && now - (state.lastTranscriptAt || 0) < 4_000) return;
      state.lastTranscript = text;
      state.lastTranscriptAt = now;
      const intent = parseIntent(text);

      if (intent.kind === "capture-card") {
        await this.runCapture(state, text);
        return;
      }

      if (intent.kind === "publish-discord") {
        if (!state.latestFinding) return void await state.present("Scout a card before publishing.");
        if (!DISCORD_WEBHOOK) return void await state.present("Discord is not configured for this server.");
        state.publishExpiresAt = now + 30_000;
        await state.present(`Publish the current text finding to ${DISCORD_LABEL}? Say confirm publish or cancel publish.`);
        return;
      }

      if (intent.kind === "confirm-publish") {
        if (!state.latestFinding || !state.publishExpiresAt || now > state.publishExpiresAt) {
          state.publishExpiresAt = undefined;
          return void await state.present("There is no active publish confirmation.");
        }
        const finding = state.latestFinding;
        state.publishExpiresAt = undefined;
        try {
          await publishFinding(DISCORD_WEBHOOK, finding);
          await state.present(`Published to ${DISCORD_LABEL}.`);
        } catch {
          session.logger.warn("Discord publish failed; webhook value was not logged");
          await state.present("Discord publish failed. Check the server configuration before trying again.");
        }
        return;
      }

      if (intent.kind === "cancel-publish") {
        state.publishExpiresAt = undefined;
        await state.present("Discord publish canceled.");
        return;
      }

      if (intent.kind === "inventory-search") {
        try {
          const matches = await searchInventory(INVENTORY_PATH, intent.query);
          await state.present(matches.length
            ? `Found ${matches.length}: ${matches.map((item) => item.title).join(", ")}.`
            : "No available inventory matches were found.");
        } catch {
          session.logger.warn("Inventory search failed without logging the query");
          await state.present("The inventory provider is unavailable.");
        }
      }
    };

    state.cleanup = session.events.onTranscription((event) => {
      if (event.isFinal && event.text) void handleTranscript(event.text);
    });
    await state.present("Scout Community ready. Say Scout this card.");
  }

  protected async onStop(sessionId: string): Promise<void> {
    this.states.get(sessionId)?.cleanup();
    this.states.delete(sessionId);
  }
}

if (!PACKAGE_NAME || !API_KEY) {
  throw new Error("MENTRAOS_PACKAGE_NAME and MENTRAOS_API_KEY are required");
}

const app = new ScoutCommunityApp({ packageName: PACKAGE_NAME, apiKey: API_KEY, port: PORT });
app.start();
