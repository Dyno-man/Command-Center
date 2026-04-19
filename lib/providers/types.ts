export type ProviderClass = "official" | "public-feed" | "unofficial";
export type LatencyClass = "RT" | "NRT" | "D" | "B";
export type ReliabilityClass = "H" | "M" | "F";
export type AuthType = "none" | "apiKey" | "basic" | "oauth" | "token" | "custom";
export type AdapterKind = "rss" | "rest-poll" | "websocket" | "release-schedule";

export interface ProviderDefinition {
  id: string;
  name: string;
  providerClass: ProviderClass;
  latencyClass: LatencyClass;
  reliabilityClass: ReliabilityClass;
  authType: AuthType;
  adapterKind: AdapterKind;
  baseUrl?: string;
  pollIntervalSeconds?: number;
  maxRequestsPerMinute?: number;
  maxConnections?: number;
  enabledByDefault: boolean;
  criticalPath: boolean;
  envVars: string[];
}

export interface EntityRef {
  type: "company" | "country" | "region" | "commodity" | "currency" | "regulator" | "theme";
  value: string;
}

export interface LocationRef {
  countryCode?: string;
  region?: string;
  label: string;
  latitude?: number;
  longitude?: number;
}

export interface RightsPolicy {
  canStoreFullText: boolean;
  canDisplayFullText: boolean;
  mustLinkToOriginal: boolean;
  attributionRequired: boolean;
  notes?: string;
}

export interface SourceRecord {
  id: string;
  provider: string;
  providerClass: ProviderClass;
  latencyClass: LatencyClass;
  reliabilityClass: ReliabilityClass;
  fetchedAt: string;
  eventTime?: string;
  publishedAt?: string;
  updatedAt?: string;
  url?: string;
  externalId?: string;
  title?: string;
  summary?: string;
  rawText?: string;
  language?: string;
  entities: EntityRef[];
  locations: LocationRef[];
  tags: string[];
  rawHash: string;
  rights: RightsPolicy;
  metadata: Record<string, unknown>;
  rawPayload: Record<string, unknown>;
}

export interface AdapterHealth {
  providerId: string;
  status: "healthy" | "degraded" | "offline";
  checkedAt: string;
  detail?: string;
}

export interface ProviderAdapter {
  providerId: string;
  healthCheck(): Promise<AdapterHealth>;
  fetchOnce(args?: Record<string, unknown>): Promise<SourceRecord[]>;
  normalize(raw: unknown): Promise<SourceRecord[]>;
}

export interface StreamingProviderAdapter extends ProviderAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(args?: Record<string, unknown>): Promise<void>;
}

export interface CryptoMarketSnapshot {
  providerId: string;
  fetchedAt: string;
  assetId: string;
  symbol: string;
  name: string;
  priceUsd: number;
  change24h: number;
  marketCap?: number;
}

export interface SeismicEvent {
  providerId: string;
  fetchedAt: string;
  externalId: string;
  place: string;
  magnitude: number;
  time: number;
  longitude: number;
  latitude: number;
  depth: number;
}
