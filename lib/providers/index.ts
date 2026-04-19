import { BaseProviderAdapter } from "@/lib/providers/base/ProviderAdapter";
import { CoinGeckoAdapter } from "@/lib/providers/coingecko/CoinGeckoAdapter";
import { GdeltAdapter } from "@/lib/providers/gdelt/GdeltAdapter";
import { providerRegistry } from "@/lib/providers/provider-registry";
import { RssAdapter } from "@/lib/providers/rss/RssAdapter";
import { UsgsAdapter } from "@/lib/providers/usgs/UsgsAdapter";

export const rssAdapter = new RssAdapter();
export const gdeltAdapter = new GdeltAdapter();
export const usgsAdapter = new UsgsAdapter();
export const coinGeckoAdapter = new CoinGeckoAdapter();

export const liveAdapters: BaseProviderAdapter[] = [
  rssAdapter,
  gdeltAdapter,
  usgsAdapter,
  coinGeckoAdapter
];

export function getEnabledProviders() {
  return providerRegistry.filter((provider) => provider.enabledByDefault);
}
