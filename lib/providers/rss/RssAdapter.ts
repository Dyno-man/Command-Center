import { createHash } from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import { BaseProviderAdapter } from "@/lib/providers/base/ProviderAdapter";
import { SourceRecord } from "@/lib/providers/types";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: ""
});

export const defaultRssFeeds = [
  { id: "bbc-world", name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { id: "bbc-business", name: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml" },
  { id: "reuters-world", name: "Reuters World", url: "https://feeds.reuters.com/Reuters/worldNews" }
];

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

export class RssAdapter extends BaseProviderAdapter {
  constructor(private readonly feeds = defaultRssFeeds) {
    super("rss_bundle", "public-feed", "NRT", "H");
  }

  async fetchOnce(): Promise<SourceRecord[]> {
    const settled = await Promise.allSettled(
      this.feeds.map(async (feed) => {
        const response = await fetch(feed.url, { next: { revalidate: 180 } });
        if (!response.ok) {
          throw new Error(`RSS fetch failed for ${feed.name}`);
        }

        const xml = await response.text();
        const parsed = parser.parse(xml);
        return this.normalize({ feed, parsed });
      })
    );

    return settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  }

  async normalize(raw: unknown): Promise<SourceRecord[]> {
    const payload = raw as { feed: { id: string; name: string }; parsed: any };
    const items = payload.parsed?.rss?.channel?.item ?? [];
    const normalizedItems = Array.isArray(items) ? items : [items];

    return normalizedItems.filter(Boolean).slice(0, 12).map((item: any, index: number) => {
      const title = item.title ?? "Untitled";
      const summary = stripHtml(item.description ?? "");
      const url = item.link ?? "#";
      const rawHash = createHash("sha256").update(`${title}|${url}|${summary}`).digest("hex");

      return this.baseRecord({
        id: `${payload.feed.id}-${index}-${rawHash.slice(0, 12)}`,
        externalId: item.guid ?? url,
        url,
        title,
        summary,
        rawText: summary,
        publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        updatedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        language: "en",
        entities: [],
        locations: [],
        tags: ["news", payload.feed.name.toLowerCase().replace(/\s+/g, "-")],
        rawHash,
        rights: this.defaultRights("Preserve publisher attribution and original links."),
        metadata: {
          feedId: payload.feed.id,
          feedName: payload.feed.name
        },
        rawPayload: item
      });
    });
  }
}
