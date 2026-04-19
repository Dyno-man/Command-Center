import { mockDashboard, mockEvents } from "@/lib/mock-data";

export function getDashboard() {
  return mockDashboard;
}

export function getEvents() {
  return mockEvents;
}

export async function getEventDetail(id: string) {
  const event = mockEvents.find((candidate) => candidate.id === id) ?? null;
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
