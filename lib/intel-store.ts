import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Region, Sentiment, Topic } from "@/lib/types";

export type PersistedIntelArticle = {
  canonicalKey: string;
  id: string;
  provider: string;
  queryLane?: string;
  source: string;
  sourceDomain?: string;
  url: string;
  title: string;
  summary: string;
  publishedAt: string;
  topic: Topic;
  region: Region;
  countryCode: string;
  sentiment: Sentiment;
  marketRelevance: number;
  laneEvidenceScore: number;
  acceptedForAnalysis: boolean;
  rejectedReason?: string;
  coordinates: { x: number; y: number };
};

export type IntelPersistenceResult = {
  totalProcessed: number;
  insertedCount: number;
  updatedCount: number;
  existingCount: number;
  newAcceptedCount: number;
  cachedAcceptedCount: number;
  skippedAnalysisCount: number;
};

export type IntelHistoryQuery = {
  countryCode?: string;
  topic?: Topic;
  provider?: string;
  lane?: string;
  acceptedOnly?: boolean;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
};

export type StoredIntelArticle = PersistedIntelArticle & {
  firstSeenAt: string;
  lastSeenAt: string;
  seenCount: number;
  firstAcceptedAt?: string;
  lastAcceptedAt?: string;
};

export type IntelHistoryResponse = {
  articles: StoredIntelArticle[];
  meta: {
    totalMatches: number;
    returnedCount: number;
    acceptedCount: number;
    range: {
      startDate?: string;
      endDate?: string;
    };
    filters: {
      countryCode?: string;
      topic?: Topic;
      provider?: string;
      lane?: string;
      acceptedOnly: boolean;
      limit: number;
      offset: number;
    };
    byTopic: Array<{ topic: Topic; count: number }>;
    byProvider: Array<{ provider: string; count: number }>;
    byLane: Array<{ lane: string; count: number }>;
  };
};

let database: DatabaseSync | null = null;

function getDatabasePath() {
  return process.env.INTEL_DB_PATH ?? join(process.cwd(), "data", "intel-articles.sqlite");
}

function getDatabase() {
  if (database) {
    return database;
  }

  const databasePath = getDatabasePath();
  mkdirSync(dirname(databasePath), { recursive: true });

  const db = new DatabaseSync(databasePath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;

    CREATE TABLE IF NOT EXISTS intel_articles (
      canonical_key TEXT PRIMARY KEY,
      id TEXT NOT NULL,
      provider TEXT NOT NULL,
      query_lane TEXT,
      source TEXT NOT NULL,
      source_domain TEXT,
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      published_at TEXT NOT NULL,
      topic TEXT NOT NULL,
      region TEXT NOT NULL,
      country_code TEXT NOT NULL,
      sentiment TEXT NOT NULL,
      market_relevance INTEGER NOT NULL,
      lane_evidence_score INTEGER NOT NULL,
      accepted_for_analysis INTEGER NOT NULL,
      rejected_reason TEXT,
      coordinates_x INTEGER NOT NULL,
      coordinates_y INTEGER NOT NULL,
      first_seen_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      seen_count INTEGER NOT NULL DEFAULT 1,
      first_accepted_at TEXT,
      last_accepted_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_intel_articles_last_seen ON intel_articles(last_seen_at DESC);
    CREATE INDEX IF NOT EXISTS idx_intel_articles_provider ON intel_articles(provider, last_seen_at DESC);
    CREATE INDEX IF NOT EXISTS idx_intel_articles_topic_country ON intel_articles(topic, country_code, last_seen_at DESC);
    CREATE INDEX IF NOT EXISTS idx_intel_articles_accepted ON intel_articles(accepted_for_analysis, last_seen_at DESC);
  `);

  database = db;
  return db;
}

export function upsertIntelArticles(articles: PersistedIntelArticle[]): IntelPersistenceResult {
  if (articles.length === 0) {
    return {
      totalProcessed: 0,
      insertedCount: 0,
      updatedCount: 0,
      existingCount: 0,
      newAcceptedCount: 0,
      cachedAcceptedCount: 0,
      skippedAnalysisCount: 0
    };
  }

  const db = getDatabase();
  const now = new Date().toISOString();
  const selectExisting = db.prepare(
    "SELECT accepted_for_analysis AS acceptedForAnalysis FROM intel_articles WHERE canonical_key = ?"
  );
  const upsert = db.prepare(`
    INSERT INTO intel_articles (
      canonical_key,
      id,
      provider,
      query_lane,
      source,
      source_domain,
      url,
      title,
      summary,
      published_at,
      topic,
      region,
      country_code,
      sentiment,
      market_relevance,
      lane_evidence_score,
      accepted_for_analysis,
      rejected_reason,
      coordinates_x,
      coordinates_y,
      first_seen_at,
      last_seen_at,
      seen_count,
      first_accepted_at,
      last_accepted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    ON CONFLICT(canonical_key) DO UPDATE SET
      id = excluded.id,
      provider = excluded.provider,
      query_lane = excluded.query_lane,
      source = excluded.source,
      source_domain = excluded.source_domain,
      url = excluded.url,
      title = excluded.title,
      summary = excluded.summary,
      published_at = excluded.published_at,
      topic = excluded.topic,
      region = excluded.region,
      country_code = excluded.country_code,
      sentiment = excluded.sentiment,
      market_relevance = excluded.market_relevance,
      lane_evidence_score = excluded.lane_evidence_score,
      accepted_for_analysis = excluded.accepted_for_analysis,
      rejected_reason = excluded.rejected_reason,
      coordinates_x = excluded.coordinates_x,
      coordinates_y = excluded.coordinates_y,
      last_seen_at = excluded.last_seen_at,
      seen_count = intel_articles.seen_count + 1,
      first_accepted_at = CASE
        WHEN intel_articles.first_accepted_at IS NULL AND excluded.accepted_for_analysis = 1 THEN excluded.last_seen_at
        ELSE intel_articles.first_accepted_at
      END,
      last_accepted_at = CASE
        WHEN excluded.accepted_for_analysis = 1 THEN excluded.last_seen_at
        ELSE intel_articles.last_accepted_at
      END
  `);

  let insertedCount = 0;
  let updatedCount = 0;
  let existingCount = 0;
  let newAcceptedCount = 0;
  let cachedAcceptedCount = 0;

  db.exec("BEGIN");
  try {
    for (const article of articles) {
      const existing = selectExisting.get(article.canonicalKey) as { acceptedForAnalysis: number } | undefined;
      if (existing) {
        existingCount += 1;
        updatedCount += 1;
      } else {
        insertedCount += 1;
      }

      if (article.acceptedForAnalysis) {
        if (existing?.acceptedForAnalysis) {
          cachedAcceptedCount += 1;
        } else {
          newAcceptedCount += 1;
        }
      }

      const acceptedAt = article.acceptedForAnalysis ? now : null;
      upsert.run(
        article.canonicalKey,
        article.id,
        article.provider,
        article.queryLane ?? null,
        article.source,
        article.sourceDomain ?? null,
        article.url,
        article.title,
        article.summary,
        article.publishedAt,
        article.topic,
        article.region,
        article.countryCode,
        article.sentiment,
        article.marketRelevance,
        article.laneEvidenceScore,
        article.acceptedForAnalysis ? 1 : 0,
        article.rejectedReason ?? null,
        article.coordinates.x,
        article.coordinates.y,
        now,
        now,
        acceptedAt,
        acceptedAt
      );
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return {
    totalProcessed: articles.length,
    insertedCount,
    updatedCount,
    existingCount,
    newAcceptedCount,
    cachedAcceptedCount,
    skippedAnalysisCount: cachedAcceptedCount
  };
}

function buildWhereClause(query: IntelHistoryQuery) {
  const clauses: string[] = [];
  const params: Array<string | number> = [];

  if (query.countryCode) {
    clauses.push("country_code = ?");
    params.push(query.countryCode.toUpperCase());
  }
  if (query.topic) {
    clauses.push("topic = ?");
    params.push(query.topic);
  }
  if (query.provider) {
    clauses.push("provider = ?");
    params.push(query.provider);
  }
  if (query.lane) {
    clauses.push("query_lane = ?");
    params.push(query.lane);
  }
  if (query.acceptedOnly) {
    clauses.push("accepted_for_analysis = 1");
  }
  if (query.startDate) {
    clauses.push("published_at >= ?");
    params.push(query.startDate);
  }
  if (query.endDate) {
    clauses.push("published_at <= ?");
    params.push(query.endDate);
  }

  return {
    whereSql: clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "",
    params
  };
}

function mapStoredArticle(row: Record<string, unknown>): StoredIntelArticle {
  return {
    canonicalKey: String(row.canonicalKey),
    id: String(row.id),
    provider: String(row.provider),
    queryLane: typeof row.queryLane === "string" ? row.queryLane : undefined,
    source: String(row.source),
    sourceDomain: typeof row.sourceDomain === "string" ? row.sourceDomain : undefined,
    url: String(row.url),
    title: String(row.title),
    summary: String(row.summary),
    publishedAt: String(row.publishedAt),
    topic: row.topic as Topic,
    region: row.region as Region,
    countryCode: String(row.countryCode),
    sentiment: row.sentiment as Sentiment,
    marketRelevance: Number(row.marketRelevance),
    laneEvidenceScore: Number(row.laneEvidenceScore),
    acceptedForAnalysis: Number(row.acceptedForAnalysis) === 1,
    rejectedReason: typeof row.rejectedReason === "string" ? row.rejectedReason : undefined,
    coordinates: {
      x: Number(row.coordinatesX),
      y: Number(row.coordinatesY)
    },
    firstSeenAt: String(row.firstSeenAt),
    lastSeenAt: String(row.lastSeenAt),
    seenCount: Number(row.seenCount),
    firstAcceptedAt: typeof row.firstAcceptedAt === "string" ? row.firstAcceptedAt : undefined,
    lastAcceptedAt: typeof row.lastAcceptedAt === "string" ? row.lastAcceptedAt : undefined
  };
}

export function queryIntelHistory(query: IntelHistoryQuery = {}): IntelHistoryResponse {
  const db = getDatabase();
  const limit = Math.max(1, Math.min(query.limit ?? 50, 250));
  const offset = Math.max(0, query.offset ?? 0);
  const { whereSql, params } = buildWhereClause(query);

  const articlesStatement = db.prepare(`
    SELECT
      canonical_key AS canonicalKey,
      id,
      provider,
      query_lane AS queryLane,
      source,
      source_domain AS sourceDomain,
      url,
      title,
      summary,
      published_at AS publishedAt,
      topic,
      region,
      country_code AS countryCode,
      sentiment,
      market_relevance AS marketRelevance,
      lane_evidence_score AS laneEvidenceScore,
      accepted_for_analysis AS acceptedForAnalysis,
      rejected_reason AS rejectedReason,
      coordinates_x AS coordinatesX,
      coordinates_y AS coordinatesY,
      first_seen_at AS firstSeenAt,
      last_seen_at AS lastSeenAt,
      seen_count AS seenCount,
      first_accepted_at AS firstAcceptedAt,
      last_accepted_at AS lastAcceptedAt
    FROM intel_articles
    ${whereSql}
    ORDER BY published_at DESC, last_seen_at DESC
    LIMIT ? OFFSET ?
  `);
  const totalStatement = db.prepare(`SELECT COUNT(*) AS count FROM intel_articles ${whereSql}`);
  const acceptedStatement = db.prepare(`
    SELECT COUNT(*) AS count
    FROM intel_articles
    ${whereSql ? `${whereSql} AND accepted_for_analysis = 1` : "WHERE accepted_for_analysis = 1"}
  `);
  const byTopicStatement = db.prepare(`
    SELECT topic, COUNT(*) AS count
    FROM intel_articles
    ${whereSql}
    GROUP BY topic
    ORDER BY count DESC, topic ASC
  `);
  const byProviderStatement = db.prepare(`
    SELECT provider, COUNT(*) AS count
    FROM intel_articles
    ${whereSql}
    GROUP BY provider
    ORDER BY count DESC, provider ASC
  `);
  const byLaneStatement = db.prepare(`
    SELECT COALESCE(query_lane, 'unknown') AS lane, COUNT(*) AS count
    FROM intel_articles
    ${whereSql}
    GROUP BY COALESCE(query_lane, 'unknown')
    ORDER BY count DESC, lane ASC
  `);

  const articles = articlesStatement
    .all(...params, limit, offset)
    .map((row) => mapStoredArticle(row as Record<string, unknown>));
  const totalMatches = Number((totalStatement.get(...params) as { count: number } | undefined)?.count ?? 0);
  const acceptedCount = Number((acceptedStatement.get(...params) as { count: number } | undefined)?.count ?? 0);
  const byTopic = byTopicStatement.all(...params).map((row) => ({ topic: row.topic as Topic, count: Number(row.count) }));
  const byProvider = byProviderStatement.all(...params).map((row) => ({ provider: String(row.provider), count: Number(row.count) }));
  const byLane = byLaneStatement.all(...params).map((row) => ({ lane: String(row.lane), count: Number(row.count) }));

  return {
    articles,
    meta: {
      totalMatches,
      returnedCount: articles.length,
      acceptedCount,
      range: {
        startDate: query.startDate,
        endDate: query.endDate
      },
      filters: {
        countryCode: query.countryCode?.toUpperCase(),
        topic: query.topic,
        provider: query.provider,
        lane: query.lane,
        acceptedOnly: query.acceptedOnly === true,
        limit,
        offset
      },
      byTopic,
      byProvider,
      byLane
    }
  };
}

export function getIntelStoreStats() {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT
      COUNT(*) AS totalArticles,
      COALESCE(SUM(accepted_for_analysis), 0) AS acceptedArticles,
      COALESCE(SUM(seen_count), 0) AS totalObservations,
      MIN(first_seen_at) AS oldestFirstSeenAt,
      MAX(last_seen_at) AS newestLastSeenAt
    FROM intel_articles
  `).get() as
    | {
        totalArticles: number;
        acceptedArticles: number;
        totalObservations: number;
        oldestFirstSeenAt?: string;
        newestLastSeenAt?: string;
      }
    | undefined;

  return {
    totalArticles: Number(row?.totalArticles ?? 0),
    acceptedArticles: Number(row?.acceptedArticles ?? 0),
    totalObservations: Number(row?.totalObservations ?? 0),
    oldestFirstSeenAt: row?.oldestFirstSeenAt,
    newestLastSeenAt: row?.newestLastSeenAt
  };
}
