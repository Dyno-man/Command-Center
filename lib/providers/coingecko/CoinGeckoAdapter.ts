import { BaseProviderAdapter } from "@/lib/providers/base/ProviderAdapter";
import { CryptoMarketSnapshot, SourceRecord } from "@/lib/providers/types";

const marketUrl =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,binancecoin&order=market_cap_desc&per_page=4&page=1&sparkline=false&price_change_percentage=24h";

export class CoinGeckoAdapter extends BaseProviderAdapter {
  constructor() {
    super("coingecko", "public-feed", "NRT", "H");
  }

  async fetchOnce(): Promise<SourceRecord[]> {
    const response = await fetch(marketUrl, { next: { revalidate: 120 } });
    if (!response.ok) {
      throw new Error("CoinGecko market fetch failed");
    }

    return this.normalize(await response.json());
  }

  async normalize(raw: unknown): Promise<SourceRecord[]> {
    const payload = raw as any[];
    const assets = Array.isArray(payload) ? payload : [];

    return assets.map((asset) =>
      this.baseRecord({
        id: `coingecko-${asset.id}`,
        externalId: asset.id,
        url: `https://www.coingecko.com/en/coins/${asset.id}`,
        title: `${asset.name} market snapshot`,
        summary: `${asset.name} changed ${Number(asset.price_change_percentage_24h_in_currency ?? 0).toFixed(2)}% in the last 24 hours.`,
        eventTime: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        entities: [{ type: "currency", value: asset.symbol?.toUpperCase() ?? asset.id }],
        locations: [],
        tags: ["markets", "crypto"],
        rawHash: `${asset.id}-${asset.current_price}`,
        rights: this.defaultRights("CoinGecko public market snapshot."),
        metadata: {
          symbol: asset.symbol,
          priceUsd: asset.current_price,
          change24h: asset.price_change_percentage_24h_in_currency,
          marketCap: asset.market_cap
        },
        rawPayload: asset
      })
    );
  }

  async fetchMarkets(): Promise<CryptoMarketSnapshot[]> {
    const response = await fetch(marketUrl, { next: { revalidate: 120 } });
    if (!response.ok) {
      throw new Error("CoinGecko market fetch failed");
    }

    const payload = await response.json();
    return (payload ?? []).map((asset: any) => ({
      providerId: this.providerId,
      fetchedAt: new Date().toISOString(),
      assetId: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      priceUsd: asset.current_price,
      change24h: asset.price_change_percentage_24h_in_currency ?? 0,
      marketCap: asset.market_cap
    }));
  }
}
