import { EventCluster, Region, Sentiment, Topic } from "@/lib/types";
import { coinGeckoAdapter, gdeltAdapter, rssAdapter } from "@/lib/providers";
import { SourceRecord } from "@/lib/providers/types";

type NormalizedArticle = {
  id: string;
  title: string;
  url: string;
  source: string;
  summary: string;
  publishedAt: string;
  topic: Topic;
  region: Region;
  countryCode: string;
  sentiment: Sentiment;
  relevanceScore: number;
};

type LiveOperatorView = {
  actionableInsights: Array<{
    id: string;
    title: string;
    recommendation: string;
    rationale: string;
    relatedEventId: string;
    priority: "critical" | "high" | "medium";
  }>;
  briefing: {
    title: string;
    summary: string;
  };
  alerts: Array<{
    id: string;
    title: string;
    severity: "high" | "medium";
    region: Region;
  }>;
  hotRegions: Array<{
    region: Region;
    averageImpact: number;
    eventCount: number;
    dominantTopic: Topic;
  }>;
};

const countryHints: Array<{ code: string; region: Region; keywords: string[]; coords: { x: number; y: number } }> = [
  { code: "US", region: "North America", keywords: ["united states", "u.s.", "usa", "american", "washington", "new york", "treasury"], coords: { x: 18, y: 33 } },
  { code: "CA", region: "North America", keywords: ["canada", "canadian", "ottawa"], coords: { x: 16, y: 22 } },
  { code: "BR", region: "South America", keywords: ["brazil", "brazilian", "brasilia"], coords: { x: 28, y: 61 } },
  { code: "PE", region: "South America", keywords: ["peru", "peruvian", "lima"], coords: { x: 26, y: 66 } },
  { code: "GB", region: "Europe", keywords: ["united kingdom", "britain", "british", "london", "bank of england", "boe"], coords: { x: 44, y: 26 } },
  { code: "DE", region: "Europe", keywords: ["germany", "german", "berlin", "frankfurt"], coords: { x: 51, y: 29 } },
  { code: "FR", region: "Europe", keywords: ["france", "french", "paris"], coords: { x: 48, y: 31 } },
  { code: "UA", region: "Europe", keywords: ["ukraine", "ukrainian", "kyiv", "black sea"], coords: { x: 56, y: 29 } },
  { code: "RU", region: "Europe", keywords: ["russia", "russian", "moscow", "kremlin"], coords: { x: 61, y: 22 } },
  { code: "YE", region: "Middle East", keywords: ["yemen", "yemeni", "red sea", "aden", "houthi", "bab el-mandeb"], coords: { x: 61, y: 48 } },
  { code: "IL", region: "Middle East", keywords: ["israel", "israeli", "gaza", "tel aviv", "jerusalem"], coords: { x: 56, y: 41 } },
  { code: "IR", region: "Middle East", keywords: ["iran", "iranian", "tehran", "hormuz"], coords: { x: 66, y: 41 } },
  { code: "EG", region: "Africa", keywords: ["egypt", "egyptian", "cairo", "suez"], coords: { x: 54, y: 42 } },
  { code: "JP", region: "Asia-Pacific", keywords: ["japan", "japanese", "boj", "yen", "tokyo"], coords: { x: 84, y: 34 } },
  { code: "CN", region: "Asia-Pacific", keywords: ["china", "chinese", "beijing", "south china sea"], coords: { x: 77, y: 38 } },
  { code: "TW", region: "Asia-Pacific", keywords: ["taiwan", "taiwanese", "taiwan strait", "taipei"], coords: { x: 80, y: 42 } },
  { code: "IN", region: "Asia-Pacific", keywords: ["india", "indian", "new delhi", "mumbai"], coords: { x: 69, y: 47 } },
  { code: "AU", region: "Asia-Pacific", keywords: ["australia", "australian", "sydney"], coords: { x: 84, y: 75 } }
];

function inferTopic(text: string): Topic {
  const lower = text.toLowerCase();
  if (/(ship|shipping|maritime|cargo|freight|tanker|port|red sea|strait|suez)/.test(lower)) return "Shipping";
  if (/(oil|gas|brent|wti|opec|refinery|energy)/.test(lower)) return "Energy";
  if (/(chip|semiconductor|ai|data center|export control|technology)/.test(lower)) return "Technology";
  if (/(central bank|interest rate|inflation|boj|fed|ecb|yen|currency|fx|intervention)/.test(lower)) return "Monetary Policy";
  if (/(tariff|sanctions|trade|supply chain|copper|export|import)/.test(lower)) return "Trade";
  return "Defense";
}

function inferSentiment(text: string): Sentiment {
  const lower = text.toLowerCase();
  if (/(risk|warn|disrupt|tighten|sanction|drop|fall|threat|conflict|strike|concern|shortage)/.test(lower)) return "negative";
  if (/(deal|ease|rebound|surge|boost|support|gain)/.test(lower)) return "positive";
  return "neutral";
}

function inferGeo(text: string) {
  const lower = text.toLowerCase();
  const scored = countryHints
    .map((country) => ({
      country,
      score: country.keywords.reduce((sum, keyword) => sum + (lower.includes(keyword) ? 1 : 0), 0)
    }))
    .sort((a, b) => b.score - a.score);

  const match = scored.find((entry) => entry.score > 0)?.country ?? countryHints[0];
  return {
    countryCode: match.code,
    region: match.region,
    coordinates: match.coords
  };
}

function computeRelevance(title: string, summary: string, topic: Topic) {
  const lower = `${title} ${summary}`.toLowerCase();
  const strongSignals = /(tariff|sanction|shipping|maritime|oil|gas|semiconductor|central bank|yen|copper|trade|export|import|power|grid|quake)/.test(lower);
  const weakSignals = /(celebrity|actor|movie|sport|award|fashion|obituary|dies aged)/.test(lower);
  const topicBoost: Record<Topic, number> = {
    Shipping: 22,
    Energy: 18,
    "Monetary Policy": 18,
    Trade: 16,
    Technology: 14,
    Defense: 10
  };

  return Math.max(0, Math.min(100, 36 + topicBoost[topic] + (strongSignals ? 18 : 0) - (weakSignals ? 28 : 0)));
}

function computeImpact(article: NormalizedArticle) {
  const topicBase: Record<Topic, number> = {
    Energy: 82,
    Defense: 72,
    Trade: 76,
    "Monetary Policy": 84,
    Technology: 78,
    Shipping: 86
  };
  return Math.min(96, topicBase[article.topic] + Math.round(article.relevanceScore * 0.08));
}

function computeUrgency(article: NormalizedArticle) {
  const hoursOld = Math.max(0, (Date.now() - new Date(article.publishedAt).getTime()) / (1000 * 60 * 60));
  return Math.max(50, Math.min(94, 92 - Math.round(hoursOld * 3)));
}

function makeAssets(topic: Topic) {
  if (topic === "Shipping") {
    return [{ asset: "Brent Crude", type: "Commodity" as const, direction: "Bullish" as const, confidence: 72, rationale: "Route stress can widen energy and freight premiums." }];
  }
  if (topic === "Monetary Policy") {
    return [{ asset: "USD/JPY", type: "FX" as const, direction: "Mixed" as const, confidence: 74, rationale: "Policy rhetoric and intervention risk can rapidly move FX." }];
  }
  if (topic === "Technology") {
    return [{ asset: "Semiconductor Equipment", type: "Sector" as const, direction: "Mixed" as const, confidence: 68, rationale: "Export controls and chip policy reprice supplier expectations." }];
  }
  return [{ asset: "Global Risk", type: "Theme" as const, direction: "Mixed" as const, confidence: 60, rationale: "This development can affect broad risk appetite." }];
}

function normalizeSourceRecord(record: SourceRecord): NormalizedArticle {
  const title = record.title ?? "Untitled";
  const summary = record.summary ?? "";
  const topic = inferTopic(`${title} ${summary}`);
  const sentiment = inferSentiment(`${title} ${summary}`);
  const geo = inferGeo(`${title} ${summary} ${record.locations.map((location) => location.label).join(" ")}`);

  return {
    id: record.id,
    title,
    url: record.url ?? "#",
    source: record.provider,
    summary,
    publishedAt: record.publishedAt ?? record.updatedAt ?? record.fetchedAt,
    topic,
    region: geo.region,
    countryCode: geo.countryCode,
    sentiment,
    relevanceScore: computeRelevance(title, summary, topic)
  };
}

function clusterArticles(articles: NormalizedArticle[]): EventCluster[] {
  const groups = new Map<string, NormalizedArticle[]>();

  for (const article of articles.filter((entry) => entry.relevanceScore >= 44)) {
    const key = `${article.countryCode}-${article.topic}`;
    const bucket = groups.get(key) ?? [];
    bucket.push(article);
    groups.set(key, bucket);
  }

  return [...groups.entries()]
    .map(([key, bucket]) => {
      const primary = bucket.slice().sort((a, b) => computeImpact(b) + computeUrgency(b) - (computeImpact(a) + computeUrgency(a)))[0];
      const geo = inferGeo(`${primary.title} ${primary.summary}`);
      const impact = Math.min(96, Math.round(bucket.reduce((sum, article) => sum + computeImpact(article), 0) / bucket.length));
      const urgency = Math.min(96, Math.round(bucket.reduce((sum, article) => sum + computeUrgency(article), 0) / bucket.length));

      return {
        id: `live-${key.toLowerCase()}`,
        headline: primary.title,
        summary: bucket.slice(0, 2).map((article) => article.summary).join(" ").slice(0, 240),
        whyItMatters: `This cluster is being surfaced because it connects ${primary.topic.toLowerCase()} developments with likely market sensitivity in ${primary.region.toLowerCase()}.`,
        nextToWatch: "Monitor confirmation from primary sources, volatility expansion, and follow-on regulatory or policy language.",
        region: primary.region,
        countryCode: primary.countryCode,
        topic: primary.topic,
        sentiment: primary.sentiment,
        impactScore: impact,
        urgencyScore: urgency,
        confidenceScore: Math.min(90, 60 + bucket.length * 6),
        updatedAt: bucket.map((article) => article.publishedAt).sort().reverse()[0],
        coordinates: geo.coordinates,
        affectedAssets: makeAssets(primary.topic),
        sources: bucket.slice(0, 4).map((article) => ({
          source: article.source,
          title: article.title,
          url: article.url,
          publishedAt: article.publishedAt
        }))
      } satisfies EventCluster;
    })
    .sort((a, b) => b.impactScore - a.impactScore)
    .slice(0, 10);
}

function deriveOperatorView(events: EventCluster[]): LiveOperatorView {
  const actionableInsights = events.slice(0, 4).map((event) => ({
    id: `live-action-${event.id}`,
    title: event.headline,
    recommendation: event.nextToWatch,
    rationale: event.whyItMatters,
    relatedEventId: event.id,
    priority: event.impactScore >= 86 ? "critical" : event.impactScore >= 76 ? "high" : "medium"
  })) as LiveOperatorView["actionableInsights"];

  const alerts = events
    .filter((event) => event.impactScore >= 80 || event.urgencyScore >= 82)
    .slice(0, 4)
    .map((event) => ({
      id: `alert-${event.id}`,
      title: `${event.headline} moved into the operator alert bucket`,
      severity: event.impactScore >= 88 ? "high" : "medium",
      region: event.region
    })) as LiveOperatorView["alerts"];

  const regionMap = new Map<Region, { totalImpact: number; count: number; topicCounts: Record<string, number> }>();
  for (const event of events) {
    const entry = regionMap.get(event.region) ?? { totalImpact: 0, count: 0, topicCounts: {} };
    entry.totalImpact += event.impactScore;
    entry.count += 1;
    entry.topicCounts[event.topic] = (entry.topicCounts[event.topic] ?? 0) + 1;
    regionMap.set(event.region, entry);
  }

  const hotRegions = [...regionMap.entries()]
    .map(([region, entry]) => ({
      region,
      averageImpact: Math.round(entry.totalImpact / entry.count),
      eventCount: entry.count,
      dominantTopic: Object.entries(entry.topicCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as Topic
    }))
    .sort((a, b) => b.averageImpact - a.averageImpact)
    .slice(0, 4);

  return {
    actionableInsights,
    briefing: {
      title: "Live Market Briefing",
      summary: events.length > 0 ? events.slice(0, 3).map((event) => `${event.region}: ${event.headline}`).join(" | ") : "No live clusters available."
    },
    alerts,
    hotRegions
  };
}

export async function getLiveEventClusters() {
  const [rssRecords, gdeltRecords] = await Promise.allSettled([rssAdapter.fetchOnce(), gdeltAdapter.fetchOnce()]);

  const sourceRecords = [
    ...(rssRecords.status === "fulfilled" ? rssRecords.value : []),
    ...(gdeltRecords.status === "fulfilled" ? gdeltRecords.value : [])
  ];

  const normalizedArticles = sourceRecords.map(normalizeSourceRecord);
  const events = clusterArticles(normalizedArticles);
  const operatorView = deriveOperatorView(events);

  return {
    generatedAt: new Date().toISOString(),
    articleCount: normalizedArticles.length,
    events,
    operatorView,
    meta: {
      ingestedArticleCount: sourceRecords.length,
      relevantArticleCount: normalizedArticles.filter((article) => article.relevanceScore >= 44).length,
      rejectedArticleCount: normalizedArticles.filter((article) => article.relevanceScore < 44).length,
      rejectedArticles: normalizedArticles
        .filter((article) => article.relevanceScore < 44)
        .slice(0, 6)
        .map((article) => ({
          id: article.id,
          title: article.title,
          source: article.source,
          relevanceScore: article.relevanceScore
        }))
    }
  };
}

export async function getLiveCryptoMarkets() {
  return coinGeckoAdapter.fetchMarkets();
}
