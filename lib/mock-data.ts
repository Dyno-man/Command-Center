import { DashboardPayload, EventCluster } from "@/lib/types";

export const mockEvents: EventCluster[] = [
  {
    id: "mock-red-sea-shipping",
    headline: "Shipping risk rises across the Red Sea corridor",
    summary: "Maritime rerouting and security warnings are raising freight and energy-route risk premiums.",
    whyItMatters: "This matters because supply-chain friction can spill into freight costs, insurance pricing, and crude risk premium.",
    nextToWatch: "Monitor tanker rerouting, insurer repricing, and any formal intervention announcements.",
    region: "Middle East",
    countryCode: "YE",
    topic: "Shipping",
    sentiment: "negative",
    impactScore: 88,
    urgencyScore: 86,
    confidenceScore: 81,
    updatedAt: new Date().toISOString(),
    coordinates: { x: 61, y: 48 },
    affectedAssets: [
      {
        asset: "Brent Crude",
        type: "Commodity",
        direction: "Bullish",
        confidence: 74,
        rationale: "Route risk can widen the energy risk premium."
      }
    ],
    sources: [
      {
        source: "Mock Wire",
        title: "Shipping risk rises across the Red Sea corridor",
        url: "#",
        publishedAt: new Date().toISOString()
      }
    ]
  },
  {
    id: "mock-japan-fx",
    headline: "FX intervention risk grows after fresh yen weakness",
    summary: "Renewed currency pressure is pulling intervention language back into focus.",
    whyItMatters: "This matters because central-bank communication can move major FX pairs and macro risk sentiment quickly.",
    nextToWatch: "Watch official comments, liquidity windows, and USD/JPY volatility expansion.",
    region: "Asia-Pacific",
    countryCode: "JP",
    topic: "Monetary Policy",
    sentiment: "negative",
    impactScore: 84,
    urgencyScore: 80,
    confidenceScore: 77,
    updatedAt: new Date().toISOString(),
    coordinates: { x: 84, y: 34 },
    affectedAssets: [
      {
        asset: "USD/JPY",
        type: "FX",
        direction: "Mixed",
        confidence: 72,
        rationale: "Intervention sensitivity can rapidly reprice FX."
      }
    ],
    sources: [
      {
        source: "Mock Wire",
        title: "FX intervention risk grows after fresh yen weakness",
        url: "#",
        publishedAt: new Date().toISOString()
      }
    ]
  }
];

export const mockDashboard: DashboardPayload = {
  generatedAt: new Date().toISOString(),
  topStories: mockEvents,
  actionableInsights: mockEvents.map((event) => ({
    id: `action-${event.id}`,
    title: event.headline,
    recommendation: event.nextToWatch,
    rationale: event.whyItMatters,
    relatedEventId: event.id,
    priority: event.impactScore >= 86 ? "critical" : "high"
  })),
  hotRegions: [
    {
      region: "Middle East",
      averageImpact: 88,
      eventCount: 1,
      dominantTopic: "Shipping"
    },
    {
      region: "Asia-Pacific",
      averageImpact: 84,
      eventCount: 1,
      dominantTopic: "Monetary Policy"
    }
  ],
  watchlistImpacts: [
    {
      asset: "Brent Crude",
      reason: "Shipping disruption is adding supply-route risk premium.",
      impactScore: 91
    },
    {
      asset: "USD/JPY",
      reason: "Intervention sensitivity is rising around Japan.",
      impactScore: 84
    }
  ],
  briefing: {
    title: "Global Market Briefing",
    summary: "Shipping risk in the Red Sea and fresh FX intervention sensitivity in Japan remain the clearest market-moving narratives."
  },
  alerts: [
    {
      id: "alert-red-sea",
      title: "Shipping risk crossed high-impact threshold",
      severity: "high",
      region: "Middle East"
    }
  ]
};
