import {
  AdapterHealth,
  ProviderAdapter,
  ProviderDefinition,
  ProviderClass,
  LatencyClass,
  ReliabilityClass,
  RightsPolicy,
  SourceRecord
} from "@/lib/providers/types";
import { getProviderDefinition } from "@/lib/providers/provider-registry";

export abstract class BaseProviderAdapter implements ProviderAdapter {
  protected readonly definition: ProviderDefinition;

  constructor(
    public readonly providerId: string,
    protected readonly providerClass: ProviderClass,
    protected readonly latencyClass: LatencyClass,
    protected readonly reliabilityClass: ReliabilityClass
  ) {
    const definition = getProviderDefinition(providerId);
    if (!definition) {
      throw new Error(`Provider definition not found for ${providerId}`);
    }
    this.definition = definition;
  }

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

  protected getEndpointUrl(key?: string) {
    if (!key) {
      return this.definition.endpoints?.find((endpoint) => endpoint.enabled !== false)?.url ?? this.definition.baseUrl ?? "";
    }

    return this.definition.endpoints?.find((endpoint) => endpoint.key === key)?.url ?? this.definition.baseUrl ?? "";
  }
}
