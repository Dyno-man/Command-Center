export type Sentiment = "positive" | "neutral" | "negative";

export type Topic =
  | "Energy"
  | "Defense"
  | "Trade"
  | "Monetary Policy"
  | "Technology"
  | "Shipping";

export type Region =
  | "North America"
  | "South America"
  | "Europe"
  | "Middle East"
  | "Africa"
  | "Asia-Pacific";

export interface AssetImpact {
  asset: string;
  type: "Equity" | "Commodity" | "FX" | "Rates" | "Sector" | "Theme";
  direction: "Bullish" | "Bearish" | "Mixed";
  confidence: number;
  rationale: string;
}

export interface SourceLink {
  source: string;
  title: string;
  url: string;
  publishedAt: string;
}

export interface CountryCoordinates {
  x: number;
  y: number;
}

export interface TopicArticle {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  sentiment: Sentiment;
}

export interface TopicGroup {
  id: string;
  topic: Topic;
  countryCode: string;
  region: Region;
  summary: string;
  articleCount: number;
  latestPublishedAt: string;
  sentiment: Sentiment;
  coordinates: CountryCoordinates;
  articles: TopicArticle[];
}

export interface CountryIntel {
  countryCode: string;
  region: Region;
  coordinates: CountryCoordinates;
  topicGroups: TopicGroup[];
  articleCount: number;
  latestPublishedAt: string;
}

export type Decision = "RECOMMEND" | "WATCH" | "PASS";

export interface CourseOfActionResult {
  decision: Decision;
  whatHappened: string;
  whyItMatters: string;
  affectedAssets: string[];
  analysis: string;
  trade?: {
    asset: string;
    direction: string;
    horizon: string;
    thesis: string;
    whyNow: string;
    risks: string;
    invalidation: string;
    confidence: number;
  };
  watchConditions?: string;
  passReason?: string;
  rawModelText?: string;
}

export interface CourseOfActionResponse {
  status: "configured" | "not_configured" | "error";
  countryCode: string;
  topic: Topic;
  model: string;
  result?: CourseOfActionResult;
  promptPreview?: {
    systemPrompt: string;
    userPrompt: string;
  };
  sources: SourceLink[];
  rawModelText?: string;
  validationError?: string;
  error?: string;
}

export interface LiveIntelPayload {
  generatedAt: string;
  countries: CountryIntel[];
  events: EventCluster[];
  meta: {
    ingestedArticleCount: number;
    groupedArticleCount: number;
    countryCount: number;
    topicGroupCount: number;
  };
}

export interface EventCluster {
  id: string;
  headline: string;
  summary: string;
  whyItMatters: string;
  nextToWatch: string;
  region: Region;
  countryCode: string;
  topic: Topic;
  sentiment: Sentiment;
  impactScore: number;
  urgencyScore: number;
  confidenceScore: number;
  updatedAt: string;
  coordinates: CountryCoordinates;
  affectedAssets: AssetImpact[];
  sources: SourceLink[];
  topicGroupId?: string;
}

export interface DashboardPayload {
  generatedAt: string;
  topStories: EventCluster[];
  actionableInsights: Array<{
    id: string;
    title: string;
    recommendation: string;
    rationale: string;
    relatedEventId: string;
    priority: "critical" | "high" | "medium";
  }>;
  hotRegions: Array<{
    region: Region;
    averageImpact: number;
    eventCount: number;
    dominantTopic: Topic;
  }>;
  watchlistImpacts: Array<{
    asset: string;
    reason: string;
    impactScore: number;
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
}
