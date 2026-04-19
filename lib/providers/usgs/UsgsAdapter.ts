import { BaseProviderAdapter } from "@/lib/providers/base/ProviderAdapter";
import { SeismicEvent, SourceRecord } from "@/lib/providers/types";

const feedUrl = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";

export class UsgsAdapter extends BaseProviderAdapter {
  constructor() {
    super("usgs_quakes", "official", "RT", "H");
  }

  async fetchOnce(): Promise<SourceRecord[]> {
    const response = await fetch(feedUrl, { next: { revalidate: 60 } });
    if (!response.ok) {
      throw new Error("USGS feed fetch failed");
    }

    return this.normalize(await response.json());
  }

  async normalize(raw: unknown): Promise<SourceRecord[]> {
    const payload = raw as { features?: any[] };
    const features = payload.features ?? [];

    return features.slice(0, 25).map((feature: any) =>
      this.baseRecord({
        id: `usgs-${feature.id}`,
        externalId: feature.id,
        url: feature.properties?.url,
        title: feature.properties?.title ?? "USGS Seismic Event",
        summary: feature.properties?.place ?? "Earthquake event",
        eventTime: feature.properties?.time ? new Date(feature.properties.time).toISOString() : undefined,
        publishedAt: feature.properties?.updated ? new Date(feature.properties.updated).toISOString() : undefined,
        updatedAt: feature.properties?.updated ? new Date(feature.properties.updated).toISOString() : undefined,
        entities: [],
        locations: [
          {
            label: feature.properties?.place ?? "Earthquake",
            longitude: feature.geometry?.coordinates?.[0],
            latitude: feature.geometry?.coordinates?.[1]
          }
        ],
        tags: ["seismic", "geospatial"],
        rawHash: feature.id,
        rights: this.defaultRights("Public USGS earthquake feed."),
        metadata: {
          magnitude: feature.properties?.mag,
          place: feature.properties?.place
        },
        rawPayload: feature
      })
    );
  }

  async fetchEvents(): Promise<SeismicEvent[]> {
    const response = await fetch(feedUrl, { next: { revalidate: 60 } });
    if (!response.ok) {
      throw new Error("USGS feed fetch failed");
    }

    const payload = await response.json();
    return (payload.features ?? []).slice(0, 25).map((feature: any) => ({
      providerId: this.providerId,
      fetchedAt: new Date().toISOString(),
      externalId: feature.id,
      place: feature.properties?.place ?? "Unknown",
      magnitude: feature.properties?.mag ?? 0,
      time: feature.properties?.time ?? Date.now(),
      longitude: feature.geometry?.coordinates?.[0] ?? 0,
      latitude: feature.geometry?.coordinates?.[1] ?? 0,
      depth: feature.geometry?.coordinates?.[2] ?? 0
    }));
  }
}
