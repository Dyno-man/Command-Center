import {
  AdapterHealth,
  ProviderAdapter,
  ProviderClass,
  LatencyClass,
  ReliabilityClass,
  RightsPolicy,
  SourceRecord
} from "@/lib/providers/types";

export abstract class BaseProviderAdapter implements ProviderAdapter {
  constructor(
    public readonly providerId: string,
    protected readonly providerClass: ProviderClass,
    protected readonly latencyClass: LatencyClass,
    protected readonly reliabilityClass: ReliabilityClass
  ) {}

  abstract fetchOnce(args?: Record<string, unknown>): Promise<SourceRecord[]>;
  abstract normalize(raw: unknown): Promise<SourceRecord[]>;

  async healthCheck(): Promise<AdapterHealth> {
    try {
      await this.fetchOnce();
      return {
        providerId: this.providerId,
        status: "healthy",
        checkedAt: new Date().toISOString()
      };
    } catch (error) {
      return {
        providerId: this.providerId,
        status: "degraded",
        checkedAt: new Date().toISOString(),
        detail: error instanceof Error ? error.message : "Unknown adapter failure"
      };
    }
  }

  protected defaultRights(notes?: string): RightsPolicy {
    return {
      canStoreFullText: false,
      canDisplayFullText: false,
      mustLinkToOriginal: true,
      attributionRequired: true,
      notes
    };
  }

  protected baseRecord(partial: Omit<SourceRecord, "provider" | "providerClass" | "latencyClass" | "reliabilityClass" | "fetchedAt">): SourceRecord {
    return {
      provider: this.providerId,
      providerClass: this.providerClass,
      latencyClass: this.latencyClass,
      reliabilityClass: this.reliabilityClass,
      fetchedAt: new Date().toISOString(),
      ...partial
    };
  }
}
