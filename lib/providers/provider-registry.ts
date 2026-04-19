import { ProviderDefinition } from "@/lib/providers/types";

export const providerRegistry: ProviderDefinition[] = [
  {
    id: "rss_bundle",
    name: "Publisher RSS Bundle",
    providerClass: "public-feed",
    latencyClass: "NRT",
    reliabilityClass: "H",
    authType: "none",
    adapterKind: "rss",
    endpoints: [
      { key: "bbc_world", url: "https://feeds.bbci.co.uk/news/world/rss.xml", description: "BBC World RSS", enabled: true },
      { key: "bbc_business", url: "https://feeds.bbci.co.uk/news/business/rss.xml", description: "BBC Business RSS", enabled: true },
      { key: "reuters_world", url: "https://feeds.reuters.com/Reuters/worldNews", description: "Reuters World RSS", enabled: true }
    ],
    pollIntervalSeconds: 180,
    maxRequestsPerMinute: 20,
    enabledByDefault: true,
    criticalPath: true,
    envVars: []
  },
  {
    id: "sec_edgar",
    name: "SEC EDGAR",
    providerClass: "official",
    latencyClass: "NRT",
    reliabilityClass: "H",
    authType: "custom",
    adapterKind: "rest-poll",
    baseUrl: "https://data.sec.gov",
    pollIntervalSeconds: 120,
    enabledByDefault: false,
    criticalPath: true,
    envVars: ["SEC_USER_AGENT"]
  },
  {
    id: "federal_register",
    name: "Federal Register",
    providerClass: "official",
    latencyClass: "NRT",
    reliabilityClass: "H",
    authType: "none",
    adapterKind: "rest-poll",
    baseUrl: "https://www.federalregister.gov/api/v1",
    pollIntervalSeconds: 300,
    enabledByDefault: false,
    criticalPath: true,
    envVars: []
  },
  {
    id: "usgs_quakes",
    name: "USGS Earthquake Feeds",
    providerClass: "official",
    latencyClass: "RT",
    reliabilityClass: "H",
    authType: "none",
    adapterKind: "rest-poll",
    baseUrl: "https://earthquake.usgs.gov",
    endpoints: [
      {
        key: "daily_summary",
        url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
        description: "Default daily earthquake GeoJSON feed",
        enabled: true
      }
    ],
    pollIntervalSeconds: 60,
    enabledByDefault: true,
    criticalPath: true,
    envVars: []
  },
  {
    id: "binance_spot_ws",
    name: "Binance Spot WebSocket",
    providerClass: "official",
    latencyClass: "RT",
    reliabilityClass: "H",
    authType: "none",
    adapterKind: "websocket",
    baseUrl: "wss://stream.binance.com:9443",
    maxConnections: 2,
    enabledByDefault: false,
    criticalPath: true,
    envVars: []
  },
  {
    id: "kraken_public_ws",
    name: "Kraken Public WebSocket",
    providerClass: "official",
    latencyClass: "RT",
    reliabilityClass: "H",
    authType: "none",
    adapterKind: "websocket",
    baseUrl: "wss://ws.kraken.com",
    maxConnections: 2,
    enabledByDefault: false,
    criticalPath: true,
    envVars: []
  },
  {
    id: "gdelt",
    name: "GDELT",
    providerClass: "public-feed",
    latencyClass: "NRT",
    reliabilityClass: "H",
    authType: "none",
    adapterKind: "rest-poll",
    baseUrl: "https://api.gdeltproject.org/api/v2/doc",
    endpoints: [
      {
        key: "energy",
        url: 'https://api.gdeltproject.org/api/v2/doc/doc?query=(oil OR gas OR lng OR refinery OR pipeline OR opec OR electricity OR "power grid") sourcelang:eng&mode=ArtList&maxrecords=20&format=json&timespan=24H',
        description: "Energy and power stress discovery lane",
        enabled: true
      },
      {
        key: "shipping",
        url: 'https://api.gdeltproject.org/api/v2/doc/doc?query=(shipping OR maritime OR tanker OR freight OR cargo OR port OR "red sea" OR suez OR hormuz OR vessel) sourcelang:eng&mode=ArtList&maxrecords=20&format=json&timespan=24H',
        description: "Shipping and route disruption discovery lane",
        enabled: true
      },
      {
        key: "trade",
        url: 'https://api.gdeltproject.org/api/v2/doc/doc?query=(tariff OR tariffs OR sanctions OR trade OR "supply chain" OR export OR import OR customs OR copper OR manufacturing) sourcelang:eng&mode=ArtList&maxrecords=20&format=json&timespan=24H',
        description: "Trade, sanctions, and supply chain discovery lane",
        enabled: true
      },
      {
        key: "monetary_policy",
        url: 'https://api.gdeltproject.org/api/v2/doc/doc?query=("central bank" OR fed OR ecb OR boj OR "bank of england" OR inflation OR "interest rate" OR intervention OR yen OR currency) sourcelang:eng&mode=ArtList&maxrecords=20&format=json&timespan=24H',
        description: "Central bank and FX discovery lane",
        enabled: true
      },
      {
        key: "semiconductors",
        url: 'https://api.gdeltproject.org/api/v2/doc/doc?query=(semiconductor OR semiconductors OR chip OR chipmaking OR "export control" OR foundry OR fab) sourcelang:eng&mode=ArtList&maxrecords=20&format=json&timespan=24H',
        description: "Semiconductor policy and supply discovery lane",
        enabled: true
      },
      {
        key: "conflict",
        url: 'https://api.gdeltproject.org/api/v2/doc/doc?query=(conflict OR strike OR attack OR blockade OR military OR drone OR missile OR protest OR unrest) sourcelang:eng&mode=ArtList&maxrecords=20&format=json&timespan=24H',
        description: "Conflict and instability discovery lane",
        enabled: true
      }
    ],
    pollIntervalSeconds: 300,
    enabledByDefault: true,
    criticalPath: false,
    envVars: []
  },
  {
    id: "acled",
    name: "ACLED",
    providerClass: "official",
    latencyClass: "NRT",
    reliabilityClass: "H",
    authType: "apiKey",
    adapterKind: "rest-poll",
    pollIntervalSeconds: 600,
    enabledByDefault: false,
    criticalPath: false,
    envVars: ["ACLED_API_KEY"]
  },
  {
    id: "reliefweb",
    name: "ReliefWeb",
    providerClass: "official",
    latencyClass: "NRT",
    reliabilityClass: "H",
    authType: "none",
    adapterKind: "rest-poll",
    baseUrl: "https://api.reliefweb.int",
    endpoints: [
      {
        key: "market_news_search",
        url: 'https://api.reliefweb.int/v2/reports?appname=&limit=2',
        description: "Default market-oriented article search",
        enabled: true
      }
    ],
    pollIntervalSeconds: 600,
    enabledByDefault: false,
    criticalPath: false,
    envVars: []
  },
  {
    id: "entsoe",
    name: "ENTSO-E Transparency",
    providerClass: "official",
    latencyClass: "NRT",
    reliabilityClass: "H",
    authType: "token",
    adapterKind: "rest-poll",
    pollIntervalSeconds: 300,
    enabledByDefault: false,
    criticalPath: false,
    envVars: ["ENTSOE_TOKEN"]
  },
  {
    id: "ercot",
    name: "ERCOT Public API",
    providerClass: "official",
    latencyClass: "RT",
    reliabilityClass: "H",
    authType: "token",
    adapterKind: "rest-poll",
    pollIntervalSeconds: 120,
    enabledByDefault: false,
    criticalPath: false,
    envVars: ["ERCOT_API_KEY", "ERCOT_TOKEN"]
  },
  {
    id: "caiso",
    name: "CAISO OASIS",
    providerClass: "official",
    latencyClass: "RT",
    reliabilityClass: "H",
    authType: "custom",
    adapterKind: "rest-poll",
    pollIntervalSeconds: 120,
    enabledByDefault: false,
    criticalPath: false,
    envVars: []
  },
  {
    id: "pjm",
    name: "PJM Data Miner 2",
    providerClass: "official",
    latencyClass: "NRT",
    reliabilityClass: "H",
    authType: "none",
    adapterKind: "rest-poll",
    pollIntervalSeconds: 180,
    enabledByDefault: false,
    criticalPath: false,
    envVars: []
  },
  {
    id: "nasa_firms",
    name: "NASA FIRMS",
    providerClass: "official",
    latencyClass: "NRT",
    reliabilityClass: "H",
    authType: "apiKey",
    adapterKind: "rest-poll",
    pollIntervalSeconds: 600,
    enabledByDefault: false,
    criticalPath: false,
    envVars: ["NASA_FIRMS_MAP_KEY"]
  },
  {
    id: "eia",
    name: "EIA API",
    providerClass: "official",
    latencyClass: "B",
    reliabilityClass: "H",
    authType: "apiKey",
    adapterKind: "release-schedule",
    pollIntervalSeconds: 3600,
    enabledByDefault: false,
    criticalPath: false,
    envVars: ["EIA_API_KEY"]
  },
  {
    id: "fred",
    name: "FRED",
    providerClass: "official",
    latencyClass: "B",
    reliabilityClass: "H",
    authType: "apiKey",
    adapterKind: "release-schedule",
    pollIntervalSeconds: 3600,
    enabledByDefault: false,
    criticalPath: false,
    envVars: ["FRED_API_KEY"]
  },
  {
    id: "bls",
    name: "BLS",
    providerClass: "official",
    latencyClass: "B",
    reliabilityClass: "H",
    authType: "none",
    adapterKind: "release-schedule",
    pollIntervalSeconds: 3600,
    enabledByDefault: false,
    criticalPath: false,
    envVars: []
  },
  {
    id: "bea",
    name: "BEA",
    providerClass: "official",
    latencyClass: "B",
    reliabilityClass: "H",
    authType: "apiKey",
    adapterKind: "release-schedule",
    pollIntervalSeconds: 3600,
    enabledByDefault: false,
    criticalPath: false,
    envVars: ["BEA_API_KEY"]
  },
  {
    id: "companies_house",
    name: "Companies House",
    providerClass: "official",
    latencyClass: "NRT",
    reliabilityClass: "H",
    authType: "apiKey",
    adapterKind: "rest-poll",
    enabledByDefault: false,
    criticalPath: false,
    envVars: ["COMPANIES_HOUSE_API_KEY"]
  },
  {
    id: "un_comtrade",
    name: "UN Comtrade",
    providerClass: "official",
    latencyClass: "B",
    reliabilityClass: "H",
    authType: "apiKey",
    adapterKind: "release-schedule",
    enabledByDefault: false,
    criticalPath: false,
    envVars: ["UN_COMTRADE_API_KEY"]
  },
  {
    id: "census_trade",
    name: "US Census Trade API",
    providerClass: "official",
    latencyClass: "B",
    reliabilityClass: "H",
    authType: "apiKey",
    adapterKind: "release-schedule",
    enabledByDefault: false,
    criticalPath: false,
    envVars: ["CENSUS_API_KEY"]
  },
  {
    id: "coingecko",
    name: "CoinGecko",
    providerClass: "public-feed",
    latencyClass: "NRT",
    reliabilityClass: "H",
    authType: "none",
    adapterKind: "rest-poll",
    baseUrl: "https://api.coingecko.com/api/v3",
    endpoints: [
      {
        key: "core_markets",
        url: "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,binancecoin&order=market_cap_desc&per_page=4&page=1&sparkline=false&price_change_percentage=24h",
        description: "Default core crypto markets snapshot",
        enabled: true
      }
    ],
    pollIntervalSeconds: 120,
    enabledByDefault: true,
    criticalPath: false,
    envVars: []
  },
  {
    id: "defillama",
    name: "DefiLlama",
    providerClass: "public-feed",
    latencyClass: "NRT",
    reliabilityClass: "M",
    authType: "none",
    adapterKind: "rest-poll",
    enabledByDefault: false,
    criticalPath: false,
    envVars: []
  },
  {
    id: "etherscan",
    name: "Etherscan",
    providerClass: "official",
    latencyClass: "NRT",
    reliabilityClass: "H",
    authType: "apiKey",
    adapterKind: "rest-poll",
    enabledByDefault: false,
    criticalPath: false,
    envVars: ["ETHERSCAN_API_KEY"]
  },
  {
    id: "dune",
    name: "Dune",
    providerClass: "official",
    latencyClass: "NRT",
    reliabilityClass: "M",
    authType: "apiKey",
    adapterKind: "rest-poll",
    enabledByDefault: false,
    criticalPath: false,
    envVars: ["DUNE_API_KEY"]
  },
  {
    id: "noaa_swpc",
    name: "NOAA SWPC",
    providerClass: "official",
    latencyClass: "NRT",
    reliabilityClass: "H",
    authType: "none",
    adapterKind: "rest-poll",
    enabledByDefault: false,
    criticalPath: false,
    envVars: []
  },
  {
    id: "aisstream",
    name: "AISStream",
    providerClass: "official",
    latencyClass: "RT",
    reliabilityClass: "M",
    authType: "apiKey",
    adapterKind: "websocket",
    enabledByDefault: false,
    criticalPath: false,
    envVars: ["AISSTREAM_API_KEY"]
  },
  {
    id: "opensky",
    name: "OpenSky Network",
    providerClass: "official",
    latencyClass: "NRT",
    reliabilityClass: "M",
    authType: "custom",
    adapterKind: "rest-poll",
    enabledByDefault: false,
    criticalPath: false,
    envVars: []
  }
];

export function getProviderDefinition(providerId: string) {
  return providerRegistry.find((provider) => provider.id === providerId) ?? null;
}
