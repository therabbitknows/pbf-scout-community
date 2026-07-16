import "dotenv/config";
import { AppServer, type AppSession } from "@mentra/sdk";
import { publishFinding } from "./connectors/discord.js";
import { parseIntent } from "./intents.js";
import { searchInventory } from "./providers/inventory.js";
import { OpenAiCompatibleVisionProvider, type CardFinding } from "./providers/vision.js";

const PACKAGE_NAME = process.env.MENTRAOS_PACKAGE_NAME?.trim() || "";
const API_KEY = process.env.MENTRAOS_API_KEY?.trim() || "";
const PORT = Number(process.env.PORT || 3000);
const DISCORD_WEBHOOK = process.env.SCOUT_DISCORD_WEBHOOK_URL?.trim() || "";
const DISCORD_LABEL = process.env.SCOUT_DISCORD_CHANNEL_LABEL?.trim() || "configured Discord channel";
const INVENTORY_PATH = process.env.SCOUT_INVENTORY_PATH?.trim() || "";

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
  cleanup: () => void;
  inFlight: boolean;
  latestFinding?: CardFinding;
  publishExpiresAt?: number;
  lastTranscript?: string;
  lastTranscriptAt?: number;
};

class ScoutCommunityApp extends AppServer {
  private readonly states = new Map<string, SessionState>();

  protected async onSession(session: AppSession, sessionId: string): Promise<void> {
    const state: SessionState = { cleanup: () => {}, inFlight: false };
    this.states.set(sessionId, state);

    const present = async (message: string): Promise<void> => {
      if (session.capabilities?.hasDisplay) {
        session.layouts.showTextWall(message);
      }
      try {
        await session.audio.speak(message);
      } catch {
        session.logger.warn("Scout audio response unavailable");
      }
    };

    const handleTranscript = async (raw: string): Promise<void> => {
      const text = raw.replace(/\s+/g, " ").trim().slice(0, 300);
      const now = Date.now();
      if (!text) return;
      if (state.lastTranscript === text && now - (state.lastTranscriptAt || 0) < 4_000) return;
      state.lastTranscript = text;
      state.lastTranscriptAt = now;
      const intent = parseIntent(text);

      if (intent.kind === "capture-card") {
        if (state.inFlight) return;
        if (!vision) {
          await present("A vision provider is not configured for this server.");
          return;
        }
        state.inFlight = true;
        try {
          await present("Scanning");
          const photo = await session.camera.requestPhoto({
            saveToGallery: false,
            size: "large",
            compress: "medium",
          });
          await present("Got it. Identifying");
          const finding = await vision.identify(photo.buffer, photo.mimeType);
          state.latestFinding = finding;
          state.publishExpiresAt = undefined;
          const confidence = Math.round(finding.confidence * 100);
          await present(`Likely ${finding.identity}, ${confidence} percent confidence. Price not verified.`);
        } catch (error) {
          const reason = error instanceof Error && error.message === "card identity was not confirmed"
            ? "Identity not confirmed. Move closer, center the card, and hold it still."
            : "Scout could not complete this capture. Check the provider and try again.";
          session.logger.warn("Scout capture failed without storing the frame");
          await present(reason);
        } finally {
          state.inFlight = false;
        }
        return;
      }

      if (intent.kind === "publish-discord") {
        if (!state.latestFinding) return void await present("Scout a card before publishing.");
        if (!DISCORD_WEBHOOK) return void await present("Discord is not configured for this server.");
        state.publishExpiresAt = now + 30_000;
        await present(`Publish the current text finding to ${DISCORD_LABEL}? Say confirm publish or cancel publish.`);
        return;
      }

      if (intent.kind === "confirm-publish") {
        if (!state.latestFinding || !state.publishExpiresAt || now > state.publishExpiresAt) {
          state.publishExpiresAt = undefined;
          return void await present("There is no active publish confirmation.");
        }
        const finding = state.latestFinding;
        state.publishExpiresAt = undefined;
        try {
          await publishFinding(DISCORD_WEBHOOK, finding);
          await present(`Published to ${DISCORD_LABEL}.`);
        } catch {
          session.logger.warn("Discord publish failed; webhook value was not logged");
          await present("Discord publish failed. Check the server configuration before trying again.");
        }
        return;
      }

      if (intent.kind === "cancel-publish") {
        state.publishExpiresAt = undefined;
        await present("Discord publish canceled.");
        return;
      }

      if (intent.kind === "inventory-search") {
        try {
          const matches = await searchInventory(INVENTORY_PATH, intent.query);
          await present(matches.length
            ? `Found ${matches.length}: ${matches.map((item) => item.title).join(", ")}.`
            : "No available inventory matches were found.");
        } catch {
          session.logger.warn("Inventory search failed without logging the query");
          await present("The inventory provider is unavailable.");
        }
      }
    };

    state.cleanup = session.events.onTranscription((event) => {
      if (event.isFinal && event.text) void handleTranscript(event.text);
    });
    await present("Scout Community ready. Say Scout this card.");
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
