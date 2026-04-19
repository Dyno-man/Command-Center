import { createHash } from "node:crypto";
import { BaseProviderAdapter } from "@/lib/providers/base/ProviderAdapter";
import { SourceRecord } from "@/lib/providers/types";

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

export class GdeltAdapter extends BaseProviderAdapter {
  constructor() {
    super("gdelt", "public-feed", "NRT", "H");
  }

  async fetchOnce(): Promise<SourceRecord[]> {
    const query = encodeURIComponent(
      '("tariffs" OR sanctions OR shipping OR oil OR semiconductor OR "central bank" OR yen OR copper) sourcelang:eng'
    );
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=ArtList&maxrecords=15&format=json&timespan=24H`;
    const response = await fetch(url, { next: { revalidate: 300 } });
    if (!response.ok) {
      throw new Error("GDELT fetch failed");
    }

    return this.normalize(await response.json());
  }

  async normalize(raw: unknown): Promise<SourceRecord[]> {
    const payload = raw as { articles?: any[] };
    const articles = payload.articles ?? [];

    return articles.slice(0, 15).map((article, index) => {
      const title = article.title ?? "Untitled";
      const summary = stripHtml(article.snippet ?? "GDELT matched coverage.");
      const url = article.url ?? "#";
      const rawHash = createHash("sha256").update(`${title}|${url}|${summary}`).digest("hex");
      const publishedAt = article.seendate
        ? new Date(
            `${article.seendate.slice(0, 4)}-${article.seendate.slice(4, 6)}-${article.seendate.slice(6, 8)}T${article.seendate.slice(8, 10)}:${article.seendate.slice(10, 12)}:${article.seendate.slice(12, 14)}Z`
          ).toISOString()
        : new Date().toISOString();

      return this.baseRecord({
        id: `gdelt-${index}-${rawHash.slice(0, 12)}`,
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
        tags: ["discovery", "gdelt"],
        rawHash,
        rights: this.defaultRights("Use as discovery support and preserve original source links."),
        metadata: {
          domain: article.domain,
          sourceCountry: article.sourcecountry
        },
        rawPayload: article
      });
    });
  }
}
