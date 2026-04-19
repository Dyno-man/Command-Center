import { createHash } from "node:crypto";
import { BaseProviderAdapter } from "@/lib/providers/base/ProviderAdapter";
import { ProviderEndpoint, SourceRecord } from "@/lib/providers/types";

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

const GDELT_REQUEST_INTERVAL_MS = 5200;

export type GdeltFetchDiagnostic = {
  lane: string;
  ok: boolean;
  status?: number;
  articleCount?: number;
  error?: string;
  durationMs: number;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseGdeltSeenDate(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return new Date().toISOString();
  }

  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) {
    return direct.toISOString();
  }

  const digits = value.replace(/\D/g, "");
  if (digits.length < 8) {
    return new Date().toISOString();
  }

  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6)) - 1;
  const day = Number(digits.slice(6, 8));
  const hour = digits.length >= 10 ? Number(digits.slice(8, 10)) : 0;
  const minute = digits.length >= 12 ? Number(digits.slice(10, 12)) : 0;
  const second = digits.length >= 14 ? Number(digits.slice(12, 14)) : 0;
  const timestamp = Date.UTC(year, month, day, hour, minute, second);

  if (Number.isNaN(timestamp)) {
    return new Date().toISOString();
  }

  return new Date(timestamp).toISOString();
}

export class GdeltAdapter extends BaseProviderAdapter {
  private lastFetchDiagnostics: GdeltFetchDiagnostic[] = [];

  constructor() {
    super("gdelt", "public-feed", "NRT", "H");
  }

  getLastFetchDiagnostics() {
    return this.lastFetchDiagnostics.map((entry) => ({ ...entry }));
  }

  private async fetchLane(endpoint: ProviderEndpoint, attempt = 1): Promise<SourceRecord[]> {
    const startedAt = Date.now();

    try {
      const response = await fetch(endpoint.url, { next: { revalidate: 300 } });
      const text = await response.text();
      const durationMs = Date.now() - startedAt;

      if (response.status === 429 && attempt < 3) {
        await sleep(GDELT_REQUEST_INTERVAL_MS);
        return this.fetchLane(endpoint, attempt + 1);
      }

      if (!response.ok) {
        throw new Error(text.trim().slice(0, 160) || `HTTP ${response.status}`);
      }

      let payload: { articles?: any[] };
      try {
        payload = JSON.parse(text);
      } catch {
        throw new Error(text.trim().slice(0, 160) || "Received non-JSON response from GDELT.");
      }

      const records = await this.normalize({ endpoint, payload });
      this.lastFetchDiagnostics.push({
        lane: endpoint.key,
        ok: true,
        status: response.status,
        articleCount: records.length,
        durationMs
      });
      return records;
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const message = error instanceof Error ? error.message : "Unknown GDELT fetch failure";
      this.lastFetchDiagnostics.push({
        lane: endpoint.key,
        ok: false,
        error: message,
        durationMs
      });
      console.warn(`[gdelt] lane ${endpoint.key} failed: ${message}`);
      return [];
    }
  }

  async fetchOnce(): Promise<SourceRecord[]> {
    const endpoints = this.definition.endpoints?.filter((endpoint) => endpoint.enabled !== false) ?? [];
    this.lastFetchDiagnostics = [];

    const records: SourceRecord[] = [];
    for (const [index, endpoint] of endpoints.entries()) {
      if (index > 0) {
        await sleep(GDELT_REQUEST_INTERVAL_MS);
      }
      records.push(...(await this.fetchLane(endpoint)));
    }

    return records;
  }

  async normalize(raw: unknown): Promise<SourceRecord[]> {
    const input = raw as { endpoint: ProviderEndpoint; payload: { articles?: any[] } };
    const lane = input.endpoint.key;
    const articles = input.payload.articles ?? [];

    return articles.slice(0, 20).map((article, index) => {
      const title = article.title ?? "Untitled";
      const summary = stripHtml(article.snippet ?? "GDELT matched coverage.");
      const url = article.url ?? "#";
      const rawHash = createHash("sha256").update(`${title}|${url}|${summary}`).digest("hex");
      const publishedAt = parseGdeltSeenDate(article.seendate);

      return this.baseRecord({
        id: `gdelt-${lane}-${index}-${rawHash.slice(0, 12)}`,
        externalId: article.url ?? rawHash,
        url,
        title,
        summary,
        rawText: summary,
        publishedAt,
        updatedAt: publishedAt,
        language: "en",
        entities: [],
        locations: article.sourcecountry
          ? [{ label: article.sourcecountry, countryCode: undefined, region: undefined }]
          : [],
        tags: ["discovery", "gdelt", `lane:${lane}`],
        rawHash,
        rights: this.defaultRights("Use as discovery support and preserve original source links."),
        metadata: {
          lane,
          domain: article.domain,
          sourceCountry: article.sourcecountry,
          sourceLanguage: article.language,
          socialImage: article.socialimage,
          titleTranslated: article.translated ?? false
        },
        rawPayload: article
      });
    });
  }
}
