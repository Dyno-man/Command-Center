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
  coordinates: {
    x: number;
    y: number;
  };
  affectedAssets: AssetImpact[];
  sources: SourceLink[];
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
