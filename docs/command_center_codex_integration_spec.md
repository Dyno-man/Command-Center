# Command Center API Integration Spec for Codex
Version: v1
Audience: Codex or any coding agent implementing provider adapters, schedulers, normalization, and health monitoring
Priority rule: Prefer RT and H providers first
Date: 2026-04-19

---

## 1. Purpose

Build a provider integration layer for Command Center that ingests free or free tier data sources, normalizes them into a shared event and market data schema, and exposes them to the application through internal ingestion jobs and internal APIs.

This document is intentionally implementation oriented. It is not a product pitch. It is a build contract.

Primary goal:
- Expand the incoming information network with the best free sources
- Prefer providers that are real time or near real time and highly reliable
- Keep every provider behind a replaceable adapter
- Preserve provenance and provider specific legal constraints
- Support map view, timeline view, cluster view, asset impact view, and alerting

---

## 2. Priority Legend

Latency:
- RT = real time or stream based
- NRT = near real time, usually minutes
- D = delayed
- B = batch or release based

Reliability:
- H = high
- M = medium
- F = fragile

Implementation preference:
1. RT + H
2. NRT + H
3. RT + M
4. NRT + M
5. Batch sources that materially improve exposure mapping or macro context

---

## 3. Highest Priority Providers To Implement First

These are the preferred first integrations because they either provide RT signal, high reliability, or both.

### Tier A: Must implement first

1. Publisher RSS bundle
- Latency: NRT
- Reliability: H
- Reason: fastest high trust news layer with source provenance
- Auth: none
- Adapter type: polling feed adapter

2. SEC EDGAR APIs
- Latency: NRT
- Reliability: H
- Reason: top primary source for corporate filings, 8 K, 10 Q, 10 K, Form 4
- Auth: none, but custom User Agent required
- Adapter type: polling API adapter

3. Federal Register API
- Latency: NRT
- Reliability: H
- Reason: primary regulatory and policy signal
- Auth: none
- Adapter type: polling API adapter

4. USGS Earthquake GeoJSON feeds
- Latency: RT
- Reliability: H
- Reason: live geospatial event overlay
- Auth: none
- Adapter type: polling API adapter

5. Binance Spot WebSocket
- Latency: RT
- Reliability: H
- Reason: free real time crypto market state and market confirmation
- Auth: none for public market data
- Adapter type: websocket adapter

6. Kraken public WebSocket and REST
- Latency: RT
- Reliability: H
- Reason: second exchange grade crypto confirmation layer
- Auth: none for public data
- Adapter type: websocket adapter

7. ERCOT Public API
- Latency: RT to intraday
- Reliability: H
- Reason: power stress and weather linked market signal
- Auth: registration + subscription key + token flow
- Adapter type: polling API adapter

8. CAISO OASIS
- Latency: RT to intraday
- Reliability: H
- Reason: California power market and grid stress signal
- Auth: self registration path may be required depending on access path
- Adapter type: polling API adapter

9. PJM Data Miner 2
- Latency: intraday
- Reliability: H
- Reason: regional power, load, congestion, and price data
- Auth: public path available, respect connection limits
- Adapter type: polling API adapter

10. ENTSO E Transparency Platform
- Latency: NRT to intraday
- Reliability: H
- Reason: European power stress and cross border electricity signal
- Auth: registration + security token
- Adapter type: polling API adapter

### Tier B: Strong next layer

11. GDELT
- Latency: NRT
- Reliability: H
- Reason: global discovery and clustering support
- Auth: none
- Adapter type: polling API adapter

12. ACLED
- Latency: NRT
- Reliability: H
- Reason: conflict, protest, violence, instability
- Auth: account and API access
- Adapter type: polling API adapter

13. ReliefWeb
- Latency: NRT
- Reliability: H
- Reason: humanitarian and crisis signal
- Auth: none
- Adapter type: polling API adapter

14. NASA FIRMS
- Latency: NRT
- Reliability: H
- Reason: fire and thermal anomaly overlay near assets and routes
- Auth: map key
- Adapter type: polling API adapter

15. EIA API
- Latency: periodic
- Reliability: H
- Reason: energy inventory and structural energy context
- Auth: free API key
- Adapter type: scheduled polling adapter

16. FRED
- Latency: batch and release based
- Reliability: H
- Reason: macro context and backtesting
- Auth: API key
- Adapter type: scheduled polling adapter

17. BLS
- Latency: batch and release based
- Reliability: H
- Reason: inflation and labor release data
- Auth: public use path
- Adapter type: scheduled polling adapter

18. BEA
- Latency: batch and release based
- Reliability: H
- Reason: GDP and industry data
- Auth: API key
- Adapter type: scheduled polling adapter

### Tier C: Useful but lower initial priority

19. Companies House
20. UN Comtrade
21. US Census Trade API
22. CoinGecko
23. DefiLlama
24. Etherscan
25. Dune
26. NOAA SWPC
27. AISStream
28. OpenSky Network

---

## 4. Providers To Avoid In Critical Path

These may still be useful, but should not power the core live loop.

1. Alpha Vantage
- Free quota is too restrictive for a live central spine
- Use only for light enrichment or fallback

2. Social feeds as primary truth
- Reddit can be useful for attention, not truth
- Do not let social chatter outrank primary evidence

3. Unofficial wrappers
- Must be sandboxed behind replaceable adapters
- Never build mission critical ingestion on unofficial sources

---

## 5. Canonical Internal Schemas

Codex should build the system around normalized models.

### 5.1 Canonical source record

```ts
type ProviderClass = "official" | "public-feed" | "unofficial";
type LatencyClass = "RT" | "NRT" | "D" | "B";
type ReliabilityClass = "H" | "M" | "F";

interface SourceRecord {
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
```

### 5.2 Canonical event cluster

```ts
interface EventCluster {
  id: string;
  clusterKey: string;
  eventType: EventType;
  firstSeenAt: string;
  lastSeenAt: string;

  title: string;
  summary: string;
  confidence: number;
  noveltyScore: number;
  severityScore: number;
  sourceWeightScore: number;
  marketImpactScore: number;

  principalEntities: EntityRef[];
  principalLocations: LocationRef[];
  evidenceIds: string[];
  affectedAssets: AssetImpact[];
  provenance: ProvenanceRef[];
}
```

### 5.3 Asset impact

```ts
interface AssetImpact {
  assetType: "equity" | "etf" | "commodity" | "fx" | "rate" | "crypto" | "sector";
  symbol: string;
  direction: "bullish" | "bearish" | "mixed" | "unclear";
  confidence: number;
  explanation: string;
  exposureType:
    | "direct"
    | "supplier"
    | "customer"
    | "macro"
    | "regulatory"
    | "geographic"
    | "logistics"
    | "power"
    | "sentiment";
}
```

### 5.4 Rights policy

```ts
interface RightsPolicy {
  canStoreFullText: boolean;
  canDisplayFullText: boolean;
  mustLinkToOriginal: boolean;
  attributionRequired: boolean;
  notes?: string;
}
```

---

## 6. Provider Registry Codex Must Create

Create a provider registry file that describes each adapter and its runtime rules.

Suggested file:
- `src/providers/provider-registry.ts`

Suggested shape:

```ts
interface ProviderDefinition {
  id: string;
  name: string;
  providerClass: "official" | "public-feed" | "unofficial";
  latencyClass: "RT" | "NRT" | "D" | "B";
  reliabilityClass: "H" | "M" | "F";
  authType: "none" | "apiKey" | "basic" | "oauth" | "token" | "custom";
  adapterKind: "rss" | "rest-poll" | "websocket" | "release-schedule";
  baseUrl?: string;
  pollIntervalSeconds?: number;
  maxRequestsPerMinute?: number;
  maxConnections?: number;
  enabledByDefault: boolean;
  criticalPath: boolean;
  envVars: string[];
}
```

Include definitions for:
- rss_bundle
- sec_edgar
- federal_register
- usgs_quakes
- binance_spot_ws
- kraken_public_ws
- gdelt
- acled
- reliefweb
- entsoe
- ercot
- caiso
- pjm
- nasa_firms
- eia
- fred
- bls
- bea
- companies_house
- un_comtrade
- census_trade
- coingecko
- defillama
- etherscan
- dune
- noaa_swpc
- aisstream
- opensky

---

## 7. Adapter Architecture

Codex should implement one adapter per provider.

Suggested structure:

- `src/providers/base/ProviderAdapter.ts`
- `src/providers/rss/RssAdapter.ts`
- `src/providers/sec/SecEdgarAdapter.ts`
- `src/providers/federal-register/FederalRegisterAdapter.ts`
- `src/providers/usgs/UsgsAdapter.ts`
- `src/providers/binance/BinanceWsAdapter.ts`
- `src/providers/kraken/KrakenWsAdapter.ts`
- `src/providers/gdelt/GdeltAdapter.ts`
- `src/providers/acled/AcledAdapter.ts`
- `src/providers/reliefweb/ReliefWebAdapter.ts`
- `src/providers/entsoe/EntsoeAdapter.ts`
- `src/providers/ercot/ErcotAdapter.ts`
- `src/providers/caiso/CaisoAdapter.ts`
- `src/providers/pjm/PjmAdapter.ts`

Base contract:

```ts
export interface ProviderAdapter {
  providerId: string;
  healthCheck(): Promise<AdapterHealth>;
  fetchOnce(args?: Record<string, unknown>): Promise<SourceRecord[]>;
  normalize(raw: unknown): Promise<SourceRecord[]>;
}
```

For websocket providers:

```ts
export interface StreamingProviderAdapter extends ProviderAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(args?: Record<string, unknown>): Promise<void>;
}
```

---

## 8. Polling and Streaming Rules

### 8.1 Polling defaults
- RSS: every 120 to 300 seconds
- SEC: every 60 to 180 seconds
- Federal Register: every 300 seconds
- GDELT: every 300 seconds
- ACLED: every 300 to 900 seconds
- USGS: every 60 seconds
- NASA FIRMS: every 300 to 900 seconds
- ERCOT, CAISO, PJM, ENTSO E: source specific polling, usually 60 to 300 seconds for high value endpoints
- EIA, FRED, BLS, BEA: release aligned or hourly/daily jobs

### 8.2 Streaming defaults
- Binance: websocket with reconnect
- Kraken: websocket with reconnect
- AISStream if enabled later: websocket with reconnect

### 8.3 Backoff
Use exponential backoff with jitter:
- base: 2 seconds
- max: 5 minutes
- reset after one successful fetch cycle

### 8.4 Circuit breaker
If a provider returns repeated failures:
- mark status degraded
- reduce poll frequency
- surface in provider health dashboard
- do not block the rest of ingestion

---

## 9. Deduplication and Clustering

Codex should implement a multistage dedupe and clustering pipeline.

### Stage 1: exact dedupe
- URL exact match
- provider external ID exact match
- raw hash exact match

### Stage 2: fuzzy headline dedupe
- normalize punctuation
- lowercase
- strip publisher suffixes
- strip market boilerplate
- compare normalized titles

### Stage 3: candidate generation
Generate candidate cluster pairs when:
- timestamps are close
- locations overlap
- principal entities overlap
- event types overlap

### Stage 4: semantic clustering
- embedding similarity for titles + summaries
- optional cross encoder rerank for borderline pairs

### Cluster key heuristic
Build from:
- eventType
- country or region
- top entities
- approximate event time bucket

Never cluster purely by text similarity.

---

## 10. Source Weighting

Codex must hardcode a deterministic source weighting layer before any LLM summarization.

Initial weights:
- official filing or regulator source: 1.00
- official infrastructure or macro source: 0.95
- trusted publisher RSS: 0.85
- discovery aggregator like GDELT: 0.70
- exchange market data: 0.85
- social attention only: 0.40
- unofficial wrappers: 0.25

Use these weights in:
- event confidence
- event importance
- narrative confidence
- alert gating

---

## 11. Market Impact Scoring

Codex should create a deterministic first pass scorer.

Suggested formula:

```ts
impact =
  credibility *
  novelty *
  severity *
  exposure *
  timeliness *
  persistence *
  crossAssetLinkage -
  uncertaintyPenalty;
```

Each subscore on a 0 to 1 scale.

Definitions:
- credibility: source weight based
- novelty: first seen and duplicate adjusted
- severity: event type and affected scale
- exposure: how directly mapped assets are touched
- timeliness: freshness decay
- persistence: one off vs ongoing
- crossAssetLinkage: number of asset classes affected
- uncertaintyPenalty: conflicting evidence or weak evidence

Output:
- `marketImpactScore`
- `topImpactedAssets[]`
- `watchNext[]`

---

## 12. Internal APIs Codex Should Build

Suggested internal service endpoints.

### Providers
- `GET /api/providers`
- `GET /api/providers/health`
- `POST /api/providers/:id/fetch`
- `POST /api/providers/:id/reconnect`

### Raw ingest and normalized records
- `GET /api/ingest/records`
- `GET /api/ingest/records/:id`

### Event clusters
- `GET /api/events`
- `GET /api/events/:id`
- `GET /api/events/hotspots`
- `GET /api/events/map`

### Market impact
- `GET /api/impact/top`
- `GET /api/impact/by-asset`
- `GET /api/impact/by-region`

### Narrative
- `GET /api/narratives/top`
- `GET /api/narratives/acceleration`

### Alerts
- `GET /api/alerts`
- `POST /api/alerts/test`

---

## 13. Database Tables Codex Should Create

Suggested tables:
- providers
- provider_health
- source_records
- event_clusters
- event_evidence
- entities
- locations
- cluster_entities
- cluster_locations
- assets
- cluster_asset_impacts
- watchlists
- alerts
- narrative_metrics

Use JSON columns for provider raw payloads.

---

## 14. Environment Variables

Codex should support at least these:

```bash
# Common
APP_ENV=development
APP_BASE_URL=http://localhost:3000
USER_AGENT=CommandCenter/1.0 your-email@example.com

# RSS
RSS_FEED_URLS=https://...

# SEC
SEC_USER_AGENT=CommandCenter/1.0 your-email@example.com

# Federal Register
FEDERAL_REGISTER_BASE_URL=https://www.federalregister.gov/api/v1

# USGS
USGS_BASE_URL=https://earthquake.usgs.gov/earthquakes/feed/v1.0

# Binance
BINANCE_WS_URL=wss://stream.binance.com:9443/ws

# Kraken
KRAKEN_WS_URL=wss://ws.kraken.com

# GDELT
GDELT_BASE_URL=https://api.gdeltproject.org/api/v2

# ACLED
ACLED_API_KEY=
ACLED_EMAIL=

# ReliefWeb
RELIEFWEB_BASE_URL=https://api.reliefweb.int

# ENTSO-E
ENTSOE_API_TOKEN=

# ERCOT
ERCOT_SUBSCRIPTION_KEY=
ERCOT_CLIENT_ID=
ERCOT_CLIENT_SECRET=

# CAISO
CAISO_BASE_URL=http://oasis.caiso.com/oasisapi

# PJM
PJM_API_KEY=

# NASA FIRMS
NASA_FIRMS_MAP_KEY=

# EIA
EIA_API_KEY=

# FRED
FRED_API_KEY=

# BEA
BEA_API_KEY=

# Companies House
COMPANIES_HOUSE_API_KEY=

# UN Comtrade
UN_COMTRADE_API_KEY=

# CoinGecko
COINGECKO_API_KEY=

# Etherscan
ETHERSCAN_API_KEY=

# Dune
DUNE_API_KEY=

# Reddit
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_USER_AGENT=CommandCenter/1.0 by your_reddit_name

# AISStream
AISSTREAM_API_KEY=

# OpenSky
OPENSKY_CLIENT_ID=
OPENSKY_CLIENT_SECRET=
```

---

## 15. Signup and Connection Instructions

This section is for the human operator.

### No signup needed
1. RSS feeds
- Curate feed list by publisher
- Store feed URL and publisher metadata in config

2. SEC EDGAR
- No API key
- Set a real User Agent with app name and email
- Respect rate limits and fair access

3. Federal Register
- No API key
- Can start immediately

4. USGS
- No API key
- Can start immediately

5. GDELT
- No API key
- Can start immediately

6. BLS
- Public use path is available without registration

7. Treasury Fiscal Data
- No key required

8. NOAA SWPC
- No key required

### Requires free signup or token

1. ACLED
- Create account
- Request API access
- Store email + key in env

2. ENTSO E
- Create Transparency Platform account
- Generate security token
- Store token in env

3. ERCOT
- Register on ERCOT developer portal
- Create app
- Obtain subscription key
- Complete auth setup
- Store credentials in env

4. CAISO
- Review OASIS access docs
- If registration is required for your chosen path, complete registration
- Store any credentials in env

5. PJM
- Create Data Miner access if required
- Respect public connection limits
- Store key if issued

6. NASA FIRMS
- Request map key
- Store key in env

7. EIA
- Sign up for free API key
- Store in env

8. FRED
- Create FRED account
- Request API key
- Store in env

9. BEA
- Sign up for API key
- Store in env

10. Companies House
- Create developer application
- Generate API key
- Use HTTP basic auth format documented by provider
- Store in env

11. UN Comtrade
- Create developer portal account
- Generate free API key
- Store in env

12. CoinGecko
- Optional for some public access, but use key if available
- Store in env if using demo or authenticated path

13. Etherscan
- Create account
- Generate API key
- Store in env

14. Dune
- Create account
- Generate API key
- Store in env

15. Reddit
- Create developer app
- Get client ID and secret
- Set compliant User Agent
- Store in env

16. AISStream
- Sign in with GitHub
- Generate API key
- Store in env

17. OpenSky
- Review commercial and non commercial restrictions first
- If permitted for your use case, create account and obtain credentials

### Public crypto feeds
1. Binance public market data
- No API key required for public market data
- Use public websocket docs
- Do not use trading endpoints

2. Kraken public market data
- No API key required for public market data
- Use public websocket docs
- Do not use trading endpoints

---

## 16. Legal and Usage Rules Codex Must Respect

1. Never store or redistribute full article text from news publishers unless explicitly allowed
2. Always store source URL and attribution
3. Every summary in UI must link to original source
4. Do not call something real time unless provider + poll setup justify it
5. Keep provider adapters isolated and replaceable
6. Respect SEC fair access and use a real User Agent
7. Respect OpenSky restrictions before any commercial use
8. Respect rate limits everywhere
9. Never make unofficial wrappers part of the critical path
10. Every provider definition should include a rights policy

---

## 17. Suggested Build Order For Codex

### Phase 1: critical backbone
- provider registry
- source record schema
- RSS adapter
- SEC adapter
- Federal Register adapter
- USGS adapter
- Binance websocket adapter
- Kraken websocket adapter
- provider health dashboard
- source normalization
- exact dedupe
- event cluster MVP
- top stories endpoint
- provider env handling

### Phase 2: operational and geopolitical edge
- GDELT adapter
- ACLED adapter
- ReliefWeb adapter
- ERCOT adapter
- CAISO adapter
- PJM adapter
- ENTSO E adapter
- NASA FIRMS adapter
- map endpoints
- market impact scoring v1
- location extraction
- entity extraction
- exposure mapping tables

### Phase 3: macro and structural context
- FRED adapter
- BLS adapter
- BEA adapter
- EIA adapter
- Companies House adapter
- UN Comtrade adapter
- Census trade adapter
- narrative acceleration metrics
- alert engine

### Phase 4: optional extensions
- CoinGecko
- Etherscan
- DefiLlama
- Dune
- NOAA SWPC
- AISStream
- OpenSky after legal review
- Reddit attention layer

---

## 18. Example Tasks To Give Codex Next

Use prompts like these after feeding this document.

### Prompt 1
Build the provider registry, environment loader, and base adapter interfaces in TypeScript. Include provider definitions for SEC, Federal Register, USGS, Binance, Kraken, GDELT, and RSS. Use strong typing and comments.

### Prompt 2
Implement SEC EDGAR, Federal Register, and USGS adapters that fetch raw data, normalize to SourceRecord, and write tests for parsing and normalization.

### Prompt 3
Implement Binance and Kraken websocket clients with reconnect logic, heartbeat handling, backoff, and normalization into a market state record.

### Prompt 4
Implement the first version of the clustering pipeline using exact dedupe, normalized headline dedupe, and entity plus timestamp candidate generation.

### Prompt 5
Implement provider health endpoints and a dashboard endpoint that reports status, last success, last error, current backoff, and next scheduled fetch.

---

## 19. Final Instruction To Codex

Build this system as a modular provider integration framework, not a pile of one off scripts. Every source must be isolated behind an adapter. Every record must preserve provenance. The first release should optimize for trust, speed, and source reliability over total provider count.
