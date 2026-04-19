import { mockDashboard, mockEvents } from "@/lib/mock-data";
import { getLiveEventClusters } from "@/lib/live-intel";

export function getDashboard() {
  return mockDashboard;
}

export function getEvents() {
  return mockEvents;
}

export async function getEventDetail(id: string) {
  let event = mockEvents.find((candidate) => candidate.id === id) ?? null;

  if (!event && id.startsWith("live-")) {
    const livePayload = await getLiveEventClusters();
    event = livePayload.events.find((candidate) => candidate.id === id) ?? null;
  }

  if (!event) {
    return null;
  }

  return {
    ...event,
    assetImpacts: event.affectedAssets,
    articles: event.sources,
    timeline: [
      {
        label: "Latest cluster update",
        timestamp: event.updatedAt,
        description: event.summary
      }
    ]
  };
}
