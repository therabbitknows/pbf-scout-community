export type VisionConfig = {
  baseUrl: string;
  model: string;
  apiKey?: string;
  timeoutMs: number;
};

export type CardFinding = {
  identity: string;
  confidence: number;
  details: string;
  recapture?: string;
  servedBy: string;
};

const CARD_PROMPT = `Identify the single collectible card in this image. Identification is the primary task, not scene description. Use only visible evidence. Never invent a grade, parallel, autograph, serial number, price, or sale. Return exactly one line:
SCOUT_CARD_V1|identity=<best supported identity or unknown>|confidence=<0.00-1.00>|details=<brief visible clues>|recapture=<none or one precise instruction>`;

function clean(value: string | undefined, limit: number): string {
  return String(value || "").replace(/[\r\n|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, limit);
}

export function parseFinding(answer: string, servedBy: string): CardFinding | null {
  const line = answer.split(/\r?\n/).find((item) => item.trim().startsWith("SCOUT_CARD_V1|"));
  if (!line) return null;
  const fields = new Map<string, string>();
  for (const part of line.split("|").slice(1)) {
    const separator = part.indexOf("=");
    if (separator < 1) return null;
    fields.set(part.slice(0, separator).trim(), part.slice(separator + 1).trim());
  }
  const confidence = Number(fields.get("confidence"));
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) return null;
  const identity = clean(fields.get("identity"), 180);
  if (!identity || /^unknown$/i.test(identity)) return null;
  return {
    identity,
    confidence,
    details: clean(fields.get("details"), 240),
    recapture: clean(fields.get("recapture"), 160).replace(/^none$/i, "") || undefined,
    servedBy: clean(servedBy, 100),
  };
}

export class OpenAiCompatibleVisionProvider {
  constructor(private readonly config: VisionConfig) {
    if (!config.baseUrl || !config.model) throw new Error("vision provider is not configured");
  }

  async identify(buffer: Buffer, mimeType: string): Promise<CardFinding> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    const startedAt = Date.now();
    try {
      const response = await fetch(`${this.config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: this.config.model,
          temperature: 0,
          messages: [{
            role: "user",
            content: [
              { type: "text", text: CARD_PROMPT },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${buffer.toString("base64")}` } },
            ],
          }],
        }),
      });
      if (!response.ok) throw new Error(`vision provider HTTP ${response.status}`);
      const payload = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> };
      const content = payload.choices?.[0]?.message?.content;
      if (typeof content !== "string") throw new Error("vision provider returned no text");
      const finding = parseFinding(content, this.config.model);
      if (!finding) throw new Error("card identity was not confirmed");
      console.info(`vision status=ok model=${this.config.model} bytes=${buffer.length} latency_ms=${Date.now() - startedAt}`);
      return finding;
    } finally {
      clearTimeout(timeout);
    }
  }
}
