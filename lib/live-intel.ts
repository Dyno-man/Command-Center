import {
  CountryIntel,
  CourseOfActionResponse,
  EventCluster,
  LiveIntelPayload,
  Region,
  Sentiment,
  SourceLink,
  Topic,
  TopicArticle,
  TopicGroup
} from "@/lib/types";
import { coinGeckoAdapter, gdeltAdapter, rssAdapter } from "@/lib/providers";
import { SourceRecord } from "@/lib/providers/types";
import { getAgentPromptDocs } from "@/lib/agent-docs";
import { validateCourseOfActionResponse } from "@/lib/course-of-action-validator";

type NormalizedArticle = TopicArticle & {
  topic: Topic;
  region: Region;
  countryCode: string;
  coordinates: { x: number; y: number };
  marketRelevance: number;
  rejectedReason?: string;
};

type CountryHint = {
  code: string;
  region: Region;
  coords: { x: number; y: number };
  keywords: string[];
};

const countryHints: CountryHint[] = [
  { code: "US", region: "North America", coords: { x: 18, y: 33 }, keywords: ["united states", "u.s.", "usa", "american", "washington", "new york", "treasury", "wall street"] },
  { code: "CA", region: "North America", coords: { x: 16, y: 22 }, keywords: ["canada", "canadian", "ottawa", "toronto"] },
  { code: "MX", region: "North America", coords: { x: 15, y: 42 }, keywords: ["mexico", "mexican", "mexico city"] },
  { code: "BR", region: "South America", coords: { x: 28, y: 61 }, keywords: ["brazil", "brazilian", "brasilia", "rio de janeiro"] },
  { code: "AR", region: "South America", coords: { x: 30, y: 76 }, keywords: ["argentina", "argentine", "buenos aires"] },
  { code: "CL", region: "South America", coords: { x: 24, y: 72 }, keywords: ["chile", "chilean", "santiago"] },
  { code: "PE", region: "South America", coords: { x: 26, y: 66 }, keywords: ["peru", "peruvian", "lima"] },
  { code: "GB", region: "Europe", coords: { x: 44, y: 26 }, keywords: ["united kingdom", "britain", "british", "london", "bank of england", "boe"] },
  { code: "FR", region: "Europe", coords: { x: 48, y: 31 }, keywords: ["france", "french", "paris"] },
  { code: "DE", region: "Europe", coords: { x: 51, y: 29 }, keywords: ["germany", "german", "berlin", "frankfurt"] },
  { code: "IT", region: "Europe", coords: { x: 52, y: 36 }, keywords: ["italy", "italian", "rome", "milan"] },
  { code: "ES", region: "Europe", coords: { x: 45, y: 36 }, keywords: ["spain", "spanish", "madrid"] },
  { code: "UA", region: "Europe", coords: { x: 56, y: 29 }, keywords: ["ukraine", "ukrainian", "kyiv", "black sea"] },
  { code: "RU", region: "Europe", coords: { x: 61, y: 22 }, keywords: ["russia", "russian", "moscow", "kremlin"] },
  { code: "EG", region: "Africa", coords: { x: 54, y: 42 }, keywords: ["egypt", "egyptian", "cairo", "suez"] },
  { code: "ZA", region: "Africa", coords: { x: 54, y: 77 }, keywords: ["south africa", "south african", "johannesburg", "capetown", "cape town"] },
  { code: "NG", region: "Africa", coords: { x: 47, y: 56 }, keywords: ["nigeria", "nigerian", "lagos", "abuja"] },
  { code: "IL", region: "Middle East", coords: { x: 56, y: 41 }, keywords: ["israel", "israeli", "gaza", "tel aviv", "jerusalem"] },
  { code: "IR", region: "Middle East", coords: { x: 66, y: 41 }, keywords: ["iran", "iranian", "tehran", "hormuz"] },
  { code: "SA", region: "Middle East", coords: { x: 61, y: 47 }, keywords: ["saudi", "saudi arabia", "riyadh", "aramco"] },
  { code: "AE", region: "Middle East", coords: { x: 65, y: 49 }, keywords: ["uae", "united arab emirates", "dubai", "abu dhabi"] },
  { code: "YE", region: "Middle East", coords: { x: 61, y: 48 }, keywords: ["yemen", "yemeni", "red sea", "aden", "houthi", "bab el-mandeb"] },
  { code: "CN", region: "Asia-Pacific", coords: { x: 77, y: 38 }, keywords: ["china", "chinese", "beijing", "south china sea"] },
  { code: "JP", region: "Asia-Pacific", coords: { x: 84, y: 34 }, keywords: ["japan", "japanese", "boj", "yen", "tokyo"] },
  { code: "TW", region: "Asia-Pacific", coords: { x: 80, y: 42 }, keywords: ["taiwan", "taiwanese", "taiwan strait", "taipei"] },
  { code: "KR", region: "Asia-Pacific", coords: { x: 82, y: 35 }, keywords: ["south korea", "korean", "seoul"] },
  { code: "IN", region: "Asia-Pacific", coords: { x: 69, y: 47 }, keywords: ["india", "indian", "new delhi", "mumbai"] },
  { code: "AU", region: "Asia-Pacific", coords: { x: 84, y: 75 }, keywords: ["australia", "australian", "sydney", "canberra"] },
  { code: "SG", region: "Asia-Pacific", coords: { x: 74, y: 57 }, keywords: ["singapore", "singaporean", "strait of malacca"] }
];

const fallbackCountry = countryHints[0];

function safeIsoDate(value?: string) {
  if (!value) {
    return new Date().toISOString();
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  return date.toISOString();
}

function inferTopic(text: string): Topic {
  const lower = text.toLowerCase();
  if (/(ship|shipping|maritime|cargo|freight|tanker|port|red sea|strait|suez|vessel)/.test(lower)) return "Shipping";
  if (/(oil|gas|brent|wti|opec|refinery|energy|lng|pipeline|power grid|electricity)/.test(lower)) return "Energy";
  if (/(chip|semiconductor|ai|data center|export control|technology|chipmaking)/.test(lower)) return "Technology";
  if (/(central bank|interest rate|inflation|boj|ecb|fed|bank of england|currency|fx|intervention|bond yields|rate cut|rate hike)/.test(lower)) return "Monetary Policy";
  if (/(tariff|sanctions|trade|supply chain|copper|export|import|manufacturing|customs|industrial output)/.test(lower)) return "Trade";
  return "Defense";
}

function inferSentiment(text: string): Sentiment {
  const lower = text.toLowerCase();
  if (/(risk|warn|disrupt|tighten|sanction|drop|fall|threat|conflict|strike|concern|shortage|attack|ban|halt)/.test(lower)) return "negative";
  if (/(deal|ease|rebound|surge|boost|support|gain|resume|expand|approve)/.test(lower)) return "positive";
  return "neutral";
}

function inferGeo(text: string, locations: SourceRecord["locations"]) {
  const lower = text.toLowerCase();
  const locationLabels = locations.map((location) => location.label.toLowerCase());
  const locationCodes = new Set(locations.map((location) => location.countryCode?.toUpperCase()).filter(Boolean));

  const scored = countryHints
    .map((country) => {
      let score = locationCodes.has(country.code) ? 4 : 0;
      score += country.keywords.reduce((sum, keyword) => sum + (lower.includes(keyword) ? 2 : 0), 0);
      score += locationLabels.reduce((sum, label) => sum + (country.keywords.some((keyword) => label.includes(keyword)) ? 1 : 0), 0);
      return { country, score };
    })
    .sort((a, b) => b.score - a.score);

  const match = scored.find((entry) => entry.score > 0)?.country ?? fallbackCountry;
  return {
    countryCode: match.code,
    region: match.region,
    coordinates: match.coords
  };
}

function buildGroupSummary(topic: Topic, articles: TopicArticle[], countryCode: string) {
  const headlines = articles
    .slice()
    .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt))
    .slice(0, 2)
    .map((article) => article.title);

  return `${topic} coverage for ${countryCode}: ${headlines.join(" | ")}`;
}

function aggregateSentiment(articles: TopicArticle[]): Sentiment {
  const score = articles.reduce((sum, article) => {
    if (article.sentiment === "positive") return sum + 1;
    if (article.sentiment === "negative") return sum - 1;
    return sum;
  }, 0);

  if (score > 0) return "positive";
  if (score < 0) return "negative";
  return "neutral";
}

function buildWhyItMatters(topicGroup: TopicGroup) {
  return `This is a ${topicGroup.topic.toLowerCase()} cluster for ${topicGroup.countryCode} built from retrieved headlines. The agent should reason from these linked sources, not from generic global scoring.`;
}

function buildNextToWatch(topicGroup: TopicGroup) {
  return `Review the latest ${topicGroup.topic.toLowerCase()} headlines for ${topicGroup.countryCode}, confirm whether the narrative is accelerating, and only escalate if the retrieved sources point to a tradable change.`;
}

function makeAssets(topic: Topic) {
  if (topic === "Shipping") {
    return [{ asset: "Freight / Energy Routes", type: "Theme" as const, direction: "Mixed" as const, confidence: 65, rationale: "Route disruptions can flow into freight, insurance, and energy pricing." }];
  }
  if (topic === "Monetary Policy") {
    return [{ asset: "FX / Rates", type: "Theme" as const, direction: "Mixed" as const, confidence: 68, rationale: "Central-bank language often transmits first into currencies and rates." }];
  }
  if (topic === "Technology") {
    return [{ asset: "Semiconductors", type: "Sector" as const, direction: "Mixed" as const, confidence: 64, rationale: "Policy and supply-chain changes reprice chip exposure quickly." }];
  }
  if (topic === "Energy") {
    return [{ asset: "Oil / Gas", type: "Commodity" as const, direction: "Mixed" as const, confidence: 67, rationale: "Energy supply, logistics, and grid events can move commodity expectations." }];
  }
  return [{ asset: "Country Risk", type: "Theme" as const, direction: "Mixed" as const, confidence: 60, rationale: "The topic may affect local market narratives and related watchlists." }];
}

function scoreMarketRelevance(title: string, summary: string, topic: Topic) {
  const text = `${title} ${summary}`.toLowerCase();

  const strongSignals = [
    /central bank/,
    /\bfed\b/,
    /\becb\b/,
    /bank of england/,
    /interest rate/,
    /inflation/,
    /tariff/,
    /sanction/,
    /export control/,
    /shipping/,
    /red sea/,
    /suez/,
    /hormuz/,
    /\boil\b/,
    /\bgas\b/,
    /\blng\b/,
    /refinery/,
    /pipeline/,
    /power grid/,
    /electricity/,
    /semiconductor/,
    /supply chain/,
    /manufacturing/,
    /regulation/,
    /regulatory/,
    /policy/,
    /earnings/,
    /guidance/,
    /production/,
    /factory/,
    /subsidy/,
    /trade deal/,
    /customs/
  ];

  const weakSignals = [
    /patent/,
    /prototype/,
    /voice-controlled/,
    /toilet/,
    /pokemon/,
    /celebrity/,
    /film star/,
    /actor/,
    /rat poison/,
    /baby food/,
    /theft/,
    /evacuation/,
    /crime/,
    /arrest/,
    /lifestyle/,
    /workplace tool/,
    /digital twin/,
    /launch event/
  ];

  const topicBase: Record<Topic, number> = {
    Energy: 18,
    "Monetary Policy": 20,
    Trade: 18,
    Shipping: 18,
    Technology: 12,
    Defense: 10
  };

  let score = topicBase[topic];
  score += strongSignals.reduce((sum, pattern) => sum + (pattern.test(text) ? 8 : 0), 0);
  score -= weakSignals.reduce((sum, pattern) => sum + (pattern.test(text) ? 10 : 0), 0);

  if (/\byen\b|\bdollar\b|\btreasury\b|\bbrent\b|\bwti\b|\bcopper\b|\bsemiconductor\b/.test(text)) score += 5;
  if (/quarter|year|multi-year|outlook|medium term|long term|capacity|demand|supply/.test(text)) score += 5;

  return Math.max(0, Math.min(100, score));
}

function getRejectionReason(title: string, summary: string, topic: Topic, marketRelevance: number) {
  const text = `${title} ${summary}`.toLowerCase();
  if (marketRelevance >= 28) {
    return undefined;
  }

  if (/(patent|prototype|voice-controlled|toilet|pokemon|theft|celebrity|film star|actor|rat poison|baby food|evacuation|crime)/.test(text)) {
    return "Low-signal general-interest or novelty coverage.";
  }

  if (topic === "Technology" && !/(export control|semiconductor|supply chain|regulation|earnings|guidance)/.test(text)) {
    return "Technology story lacks clear policy, supply-chain, or earnings relevance.";
  }

  if (topic === "Energy" && !/(oil|gas|lng|refinery|pipeline|power grid|electricity|opec|production|demand|supply)/.test(text)) {
    return "Energy story lacks durable demand, supply, or policy relevance.";
  }

  return "Insufficient evidence of medium-term market impact.";
}

function isRichEnoughForAgent(article: NormalizedArticle) {
  return article.marketRelevance >= 28;
}

function normalizeSourceRecord(record: SourceRecord): NormalizedArticle {
  const title = record.title ?? "Untitled";
  const summary = record.summary ?? "";
  const topic = inferTopic(`${title} ${summary}`);
  const sentiment = inferSentiment(`${title} ${summary}`);
  const geo = inferGeo(`${title} ${summary}`, record.locations);
  const marketRelevance = scoreMarketRelevance(title, summary, topic);

  return {
    id: record.id,
    title,
    summary,
    url: record.url ?? "#",
    source: record.provider,
    publishedAt: safeIsoDate(record.publishedAt ?? record.updatedAt ?? record.fetchedAt),
    topic,
    region: geo.region,
    countryCode: geo.countryCode,
    sentiment,
    coordinates: geo.coordinates,
    marketRelevance,
    rejectedReason: getRejectionReason(title, summary, topic, marketRelevance)
  };
}

function groupArticlesByCountryAndTopic(articles: NormalizedArticle[]) {
  const grouped = new Map<string, NormalizedArticle[]>();

  for (const article of articles.filter(isRichEnoughForAgent)) {
    const key = `${article.countryCode}-${article.topic}`;
    const bucket = grouped.get(key) ?? [];
    bucket.push(article);
    grouped.set(key, bucket);
  }

  const topicGroups = [...grouped.entries()]
    .map(([key, bucket]) => {
      const [countryCode, topic] = key.split("-") as [string, Topic];
      const newestFirst = bucket.slice().sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
      const lead = newestFirst[0];

      return {
        id: `topic-${countryCode.toLowerCase()}-${topic.toLowerCase().replace(/\s+/g, "-")}`,
        topic,
        countryCode,
        region: lead.region,
        summary: buildGroupSummary(topic, newestFirst, countryCode),
        articleCount: newestFirst.length,
        latestPublishedAt: lead.publishedAt,
        sentiment: aggregateSentiment(newestFirst),
        coordinates: lead.coordinates,
        articles: newestFirst.map((article) => ({
          id: article.id,
          title: article.title,
          summary: article.summary,
          url: article.url,
          source: article.source,
          publishedAt: article.publishedAt,
          sentiment: article.sentiment
        }))
      } satisfies TopicGroup;
    })
    .sort((a, b) => +new Date(b.latestPublishedAt) - +new Date(a.latestPublishedAt));

  const countryMap = new Map<string, CountryIntel>();
  for (const group of topicGroups) {
    const existing = countryMap.get(group.countryCode);
    if (!existing) {
      countryMap.set(group.countryCode, {
        countryCode: group.countryCode,
        region: group.region,
        coordinates: group.coordinates,
        topicGroups: [group],
        articleCount: group.articleCount,
        latestPublishedAt: group.latestPublishedAt
      });
      continue;
    }

    existing.topicGroups.push(group);
    existing.articleCount += group.articleCount;
    if (+new Date(group.latestPublishedAt) > +new Date(existing.latestPublishedAt)) {
      existing.latestPublishedAt = group.latestPublishedAt;
    }
  }

  const countries = [...countryMap.values()]
    .map((country) => ({
      ...country,
      topicGroups: country.topicGroups.sort((a, b) => +new Date(b.latestPublishedAt) - +new Date(a.latestPublishedAt))
    }))
    .sort((a, b) => +new Date(b.latestPublishedAt) - +new Date(a.latestPublishedAt));

  return { countries, topicGroups };
}

function makeDisplayEvents(topicGroups: TopicGroup[]): EventCluster[] {
  return topicGroups.map((group) => {
    const lead = group.articles[0];
    const articleVelocity = Math.min(group.articleCount, 6);
    const recencyHours = Math.max(0, (Date.now() - +new Date(group.latestPublishedAt)) / (1000 * 60 * 60));
    const displayWeight = Math.max(35, Math.min(92, 46 + articleVelocity * 6 - Math.round(recencyHours * 2)));

    return {
      id: `live-${group.id}`,
      headline: lead?.title ?? `${group.countryCode} ${group.topic}`,
      summary: group.summary,
      whyItMatters: buildWhyItMatters(group),
      nextToWatch: buildNextToWatch(group),
      region: group.region,
      countryCode: group.countryCode,
      topic: group.topic,
      sentiment: group.sentiment,
      impactScore: displayWeight,
      urgencyScore: displayWeight,
      confidenceScore: Math.min(88, 55 + group.articleCount * 5),
      updatedAt: group.latestPublishedAt,
      coordinates: group.coordinates,
      affectedAssets: makeAssets(group.topic),
      sources: group.articles.slice(0, 5).map((article) => ({
        source: article.source,
        title: article.title,
        url: article.url,
        publishedAt: article.publishedAt
      })),
      topicGroupId: group.id
    };
  });
}

function getTopicGroupSources(topicGroup: TopicGroup): SourceLink[] {
  return topicGroup.articles.slice(0, 6).map((article) => ({
    source: article.source,
    title: article.title,
    url: article.url,
    publishedAt: article.publishedAt
  }));
}

async function buildPromptPayload(topicGroup: TopicGroup) {
  const docs = await getAgentPromptDocs();
  const sourceLines = topicGroup.articles
    .slice(0, 6)
    .map((article, index) => `${index + 1}. [${article.source}] ${article.title} (${article.publishedAt}) - ${article.summary}`)
    .join("\n");

  const userPrompt = [
    "Evaluate this country/topic cluster using only the retrieved evidence below.",
    "This is a medium-term to long-term investment decision task for a 1 to 12 month horizon.",
    "Do not use short-term trading logic, intraday framing, or weak tactical commentary.",
    "Only issue RECOMMEND when the evidence supports a high-conviction, conservative idea.",
    "Prefer WATCH or PASS when evidence is weak, indirect, speculative, or insufficiently confirmed.",
    "Do not introduce generic market opinions or unsupported assumptions.",
    "Respond in markdown only.",
    "Start with the heading `## Decision` and follow the documented section order exactly.",
    "Do not wrap the response in code fences.",
    "",
    `Country: ${topicGroup.countryCode}`,
    `Region: ${topicGroup.region}`,
    `Topic: ${topicGroup.topic}`,
    `Cluster summary: ${topicGroup.summary}`,
    "",
    "Retrieved articles:",
    sourceLines,
    "",
    "Return the exact documented response structure."
  ].join("\n");

  return {
    systemPrompt: docs.systemPrompt,
    userPrompt
  };
}

export async function getLiveIntel(): Promise<LiveIntelPayload> {
  const [rssRecords, gdeltRecords] = await Promise.allSettled([rssAdapter.fetchOnce(), gdeltAdapter.fetchOnce()]);

  const sourceRecords = [
    ...(rssRecords.status === "fulfilled" ? rssRecords.value : []),
    ...(gdeltRecords.status === "fulfilled" ? gdeltRecords.value : [])
  ];

  const normalizedArticles = sourceRecords.map(normalizeSourceRecord);
  const relevantArticles = normalizedArticles.filter(isRichEnoughForAgent);
  const grouped = groupArticlesByCountryAndTopic(normalizedArticles);
  const events = makeDisplayEvents(grouped.topicGroups);

  return {
    generatedAt: new Date().toISOString(),
    countries: grouped.countries,
    events,
    meta: {
      ingestedArticleCount: sourceRecords.length,
      groupedArticleCount: relevantArticles.length,
      countryCount: grouped.countries.length,
      topicGroupCount: grouped.topicGroups.length
    }
  };
}

export async function getLiveEventClusters() {
  return getLiveIntel();
}

export async function getCountryTopicGroup(countryCode: string, topic: Topic) {
  const payload = await getLiveIntel();
  return (
    payload.countries
      .find((country) => country.countryCode === countryCode.toUpperCase())
      ?.topicGroups.find((group) => group.topic === topic) ?? null
  );
}

export async function getCourseOfAction(countryCode: string, topic: Topic): Promise<CourseOfActionResponse> {
  const topicGroup = await getCountryTopicGroup(countryCode, topic);
  const model = process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";

  if (!topicGroup) {
    return {
      status: "error",
      countryCode,
      topic,
      model,
      error: "Country/topic group not found.",
      sources: []
    };
  }

  const prompt = await buildPromptPayload(topicGroup);
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return {
      status: "not_configured",
      countryCode: topicGroup.countryCode,
      topic: topicGroup.topic,
      model,
      promptPreview: prompt,
      sources: getTopicGroupSources(topicGroup)
    };
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: prompt.systemPrompt
          },
          {
            role: "user",
            content: prompt.userPrompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        status: "error",
        countryCode: topicGroup.countryCode,
        topic: topicGroup.topic,
        model,
        sources: getTopicGroupSources(topicGroup),
        promptPreview: prompt,
        error: errorText.slice(0, 400)
      };
    }

    const payload = await response.json();
    const rawContent = payload?.choices?.[0]?.message?.content;
    const rawText =
      typeof rawContent === "string"
        ? rawContent
        : Array.isArray(rawContent)
          ? rawContent
              .map((part: { type?: string; text?: string }) => (part?.type === "text" ? part.text ?? "" : ""))
              .join("")
          : JSON.stringify(rawContent);
    const validation = validateCourseOfActionResponse(rawText);

    if (!validation.ok) {
      return {
        status: "error",
        countryCode: topicGroup.countryCode,
        topic: topicGroup.topic,
        model,
        sources: getTopicGroupSources(topicGroup),
        rawModelText: rawText,
        validationError: validation.error,
        error: "Model response failed validation."
      };
    }

    return {
      status: "configured",
      countryCode: topicGroup.countryCode,
      topic: topicGroup.topic,
      model,
      result: validation.result,
      sources: getTopicGroupSources(topicGroup),
      rawModelText: rawText
    };
  } catch (error) {
    return {
      status: "error",
      countryCode: topicGroup.countryCode,
      topic: topicGroup.topic,
      model,
      sources: getTopicGroupSources(topicGroup),
      promptPreview: prompt,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

export async function getLiveCryptoMarkets() {
  return coinGeckoAdapter.fetchMarkets();
}
