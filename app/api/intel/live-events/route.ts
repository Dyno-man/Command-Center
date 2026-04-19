import { NextResponse } from "next/server";
import { getEvents } from "@/lib/queries";

export async function GET() {
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    articleCount: getEvents().length,
    events: getEvents(),
    operatorView: {
      actionableInsights: getEvents().slice(0, 2).map((event) => ({
        id: `live-action-${event.id}`,
        title: event.headline,
        recommendation: event.nextToWatch,
        rationale: event.whyItMatters,
        relatedEventId: event.id,
        priority: event.impactScore >= 86 ? "critical" : "high"
      })),
      briefing: {
        title: "Recovered Market Briefing",
        summary: getEvents().map((event) => `${event.region}: ${event.headline}`).join(" | ")
      },
      alerts: getEvents().slice(0, 2).map((event) => ({
        id: `alert-${event.id}`,
        title: `${event.headline} moved into the operator alert bucket`,
        severity: event.impactScore >= 88 ? "high" : "medium",
        region: event.region
      })),
      hotRegions: [
        {
          region: "Middle East",
          averageImpact: 88,
          eventCount: 1,
          dominantTopic: "Shipping"
        }
      ]
    },
    meta: {
      ingestedArticleCount: 2,
      relevantArticleCount: 2,
      rejectedArticleCount: 0,
      rejectedArticles: []
    }
  });
}
