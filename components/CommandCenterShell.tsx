"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "@/app/page.module.css";
import { CountryIntel, DashboardPayload, EventCluster, LlmCourseOfAction, Topic, TopicGroup } from "@/lib/types";
import { WorldLocation } from "@/lib/world-map";

function markerSize(articleCount: number) {
  return Math.max(22, Math.min(48, 20 + articleCount * 3));
}

function buildFallbackCountries(events: EventCluster[]): CountryIntel[] {
  const grouped = new Map<string, CountryIntel>();

  for (const event of events) {
    const group: TopicGroup = {
      id: event.topicGroupId ?? `${event.countryCode}-${event.topic}`,
      topic: event.topic,
      countryCode: event.countryCode,
      region: event.region,
      summary: event.summary,
      articleCount: event.sources.length,
      latestPublishedAt: event.updatedAt,
      sentiment: event.sentiment,
      coordinates: event.coordinates,
      articles: event.sources.map((source, index) => ({
        id: `${event.id}-${index}`,
        title: source.title,
        summary: event.summary,
        url: source.url,
        source: source.source,
        publishedAt: source.publishedAt,
        sentiment: event.sentiment
      }))
    };

    const existing = grouped.get(event.countryCode);
    if (!existing) {
      grouped.set(event.countryCode, {
        countryCode: event.countryCode,
        region: event.region,
        coordinates: event.coordinates,
        topicGroups: [group],
        articleCount: group.articleCount,
        latestPublishedAt: group.latestPublishedAt
      });
      continue;
    }

    existing.topicGroups.push(group);
    existing.articleCount += group.articleCount;
    if (+new Date(group.latestPublishedAt) > +new Date(existing.latestPublishedAt)) {
      existing.latestPublishedAt = group.latestPublishedAt;
    }
  }

  return [...grouped.values()];
}

export function CommandCenterShell({
  dashboard,
  events,
  countries,
  worldViewBox
}: {
  dashboard: DashboardPayload;
  events: EventCluster[];
  countries: WorldLocation[];
  worldViewBox: string;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<
    | {
        type: "card" | "map";
        pointerId: number;
        startX: number;
        startY: number;
        originX: number;
        originY: number;
      }
    | null
  >(null);
  const [selectedCountryCode, setSelectedCountryCode] = useState("ALL");
  const [selectedTopic, setSelectedTopic] = useState<Topic | "ALL">("ALL");
  const [sentimentFilter, setSentimentFilter] = useState<TopicGroup["sentiment"] | "ALL">("ALL");
  const [railOpen, setRailOpen] = useState(true);
  const [cardPosition, setCardPosition] = useState({ x: 24, y: 340 });
  const [mapTransform, setMapTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [liveCountries, setLiveCountries] = useState<CountryIntel[]>([]);
  const [liveMeta, setLiveMeta] = useState<{ groupedArticleCount: number; ingestedArticleCount: number; countryCount: number; topicGroupCount: number } | null>(null);
  const [recommendation, setRecommendation] = useState<LlmCourseOfAction | null>(null);
  const [recommendationLoading, setRecommendationLoading] = useState(false);

  const countryIntel = liveCountries.length > 0 ? liveCountries : buildFallbackCountries(events);

  const filteredCountries = useMemo(() => {
    return countryIntel
      .map((country) => ({
        ...country,
        topicGroups: country.topicGroups.filter((group) => {
          if (selectedTopic !== "ALL" && group.topic !== selectedTopic) return false;
          if (sentimentFilter !== "ALL" && group.sentiment !== sentimentFilter) return false;
          return true;
        })
      }))
      .filter((country) => {
        if (selectedCountryCode !== "ALL" && country.countryCode !== selectedCountryCode) return false;
        return country.topicGroups.length > 0;
      });
  }, [countryIntel, selectedCountryCode, selectedTopic, sentimentFilter]);

  const mapCountries = selectedCountryCode === "ALL" ? filteredCountries : filteredCountries.filter((country) => country.countryCode === selectedCountryCode);
  const selectedCountry =
    filteredCountries.find((country) => country.countryCode === selectedCountryCode) ??
    filteredCountries[0] ??
    countryIntel[0] ??
    null;
  const selectedGroup =
    (selectedTopic !== "ALL" ? selectedCountry?.topicGroups.find((group) => group.topic === selectedTopic) : null) ??
    selectedCountry?.topicGroups[0] ??
    null;
  const selectedWorldCountry = countries.find((country) => country.id.toUpperCase() === selectedCountry?.countryCode);

  useEffect(() => {
    async function loadLiveIntel() {
      try {
        const response = await fetch("/api/intel/live-events");
        if (!response.ok) {
          return;
        }

        const payload = await response.json();
        setLiveCountries(payload.countries ?? []);
        setLiveMeta(payload.meta ?? null);
      } catch {
        setLiveCountries([]);
        setLiveMeta(null);
      }
    }

    void loadLiveIntel();
  }, []);

  useEffect(() => {
    if (selectedCountryCode === "ALL" || filteredCountries.some((country) => country.countryCode === selectedCountryCode)) {
      return;
    }
    setSelectedCountryCode(filteredCountries[0]?.countryCode ?? "ALL");
  }, [filteredCountries, selectedCountryCode]);

  useEffect(() => {
    if (!selectedCountry) {
      setRecommendation(null);
      return;
    }

    if (selectedTopic === "ALL") {
      return;
    }

    if (selectedCountry.topicGroups.some((group) => group.topic === selectedTopic)) {
      return;
    }

    setSelectedTopic(selectedCountry.topicGroups[0]?.topic ?? "ALL");
  }, [selectedCountry, selectedTopic]);

  useEffect(() => {
    setRecommendation(null);
  }, [selectedCountryCode, selectedTopic, sentimentFilter]);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      if (!dragState.current) {
        return;
      }

      const deltaX = event.clientX - dragState.current.startX;
      const deltaY = event.clientY - dragState.current.startY;

      if (dragState.current.type === "card") {
        setCardPosition({
          x: dragState.current.originX + deltaX,
          y: dragState.current.originY + deltaY
        });
        return;
      }

      setMapTransform({
        x: dragState.current.originX + deltaX,
        y: dragState.current.originY + deltaY,
        scale: mapTransform.scale
      });
    }

    function handlePointerUp(event: PointerEvent) {
      if (dragState.current?.pointerId === event.pointerId) {
        dragState.current = null;
      }
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [mapTransform.scale]);

  function handleCardPointerDown(event: React.PointerEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("a,button,select")) {
      return;
    }

    dragState.current = {
      type: "card",
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: cardPosition.x,
      originY: cardPosition.y
    };
  }

  function handleMapPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("button,a,article,select")) {
      return;
    }

    dragState.current = {
      type: "map",
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: mapTransform.x,
      originY: mapTransform.y
    };
  }

  function handleMapWheel(event: React.WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const nextScale = Math.max(0.8, Math.min(3, mapTransform.scale - event.deltaY * 0.001));
    setMapTransform((current) => ({
      ...current,
      scale: Number(nextScale.toFixed(3))
    }));
  }

  async function requestRecommendation() {
    if (!selectedCountry || !selectedGroup) {
      return;
    }

    setRecommendationLoading(true);
    try {
      const response = await fetch("/api/intel/course-of-action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          countryCode: selectedCountry.countryCode,
          topic: selectedGroup.topic
        })
      });

      const payload = await response.json();
      setRecommendation(payload);
    } catch {
      setRecommendation({
        status: "error",
        countryCode: selectedCountry.countryCode,
        topic: selectedGroup.topic,
        model: "unavailable",
        recommendation: "monitor",
        confidence: "low",
        summary: "The recommendation request failed.",
        reasoning: ["The backend could not complete the request."],
        triggers: [],
        risks: ["Check the API route and provider configuration."],
        sources: selectedGroup.articles.map((article) => ({
          source: article.source,
          title: article.title,
          url: article.url,
          publishedAt: article.publishedAt
        }))
      });
    } finally {
      setRecommendationLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.topBar}>
          <div className={styles.brandBlock}>
            <p className={styles.eyebrow}>Command Center</p>
            <h1 className={styles.brandTitle}>Country Topic Intelligence Map</h1>
            <p className={styles.brandSubtitle}>Click a country, inspect grouped topics, then ask the agent whether to ignore, monitor, or act.</p>
          </div>

          <div className={styles.filterDock}>
            <div className={styles.filterHeader}>
              <p className={styles.eyebrow}>Filters</p>
              <button
                type="button"
                className={styles.filterReset}
                onClick={() => {
                  setSelectedCountryCode("ALL");
                  setSelectedTopic("ALL");
                  setSentimentFilter("ALL");
                }}
              >
                Reset
              </button>
            </div>
            <div className={styles.filterGrid}>
              <label className={styles.filterField}>
                <span>Country</span>
                <select value={selectedCountryCode} onChange={(event) => setSelectedCountryCode(event.target.value)}>
                  <option value="ALL">All countries</option>
                  {countryIntel.map((country) => {
                    const countryMeta = countries.find((entry) => entry.id.toUpperCase() === country.countryCode);
                    return (
                      <option key={country.countryCode} value={country.countryCode}>
                        {countryMeta?.name ?? country.countryCode}
                      </option>
                    );
                  })}
                </select>
              </label>
              <label className={styles.filterField}>
                <span>Topic</span>
                <select value={selectedTopic} onChange={(event) => setSelectedTopic(event.target.value as Topic | "ALL")}>
                  <option value="ALL">All topics</option>
                  {[...new Set(countryIntel.flatMap((country) => country.topicGroups.map((group) => group.topic)))].map((topic) => (
                    <option key={topic} value={topic}>
                      {topic}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.filterField}>
                <span>Sentiment</span>
                <select value={sentimentFilter} onChange={(event) => setSentimentFilter(event.target.value as TopicGroup["sentiment"] | "ALL")}>
                  <option value="ALL">All sentiment</option>
                  <option value="negative">Negative</option>
                  <option value="neutral">Neutral</option>
                  <option value="positive">Positive</option>
                </select>
              </label>
            </div>
          </div>

          <div className={styles.statusBlock}>
            <p className={styles.eyebrow}>Harness Status</p>
            <p className={styles.statusText}>{filteredCountries.length} countries in view</p>
            <p className={styles.statusMeta}>
              {liveMeta
                ? `${liveMeta.groupedArticleCount}/${liveMeta.ingestedArticleCount} articles grouped into ${liveMeta.topicGroupCount} country-topic buckets`
                : `${dashboard.topStories.length} fallback events loaded`}
            </p>
          </div>
        </div>

        <section className={styles.mapStage}>
          <div className={styles.mapBackdrop} />
          <div className={styles.mapGrid} />

          <div ref={stageRef} className={styles.mapViewport} onPointerDown={handleMapPointerDown} onWheel={handleMapWheel}>
            <div
              className={styles.mapCanvas}
              style={{
                transform: `translate(${mapTransform.x}px, ${mapTransform.y}px) scale(${mapTransform.scale})`
              }}
            >
              <svg className={styles.mapSvg} viewBox={worldViewBox} aria-label="Interactive world map">
                <g>
                  {countries.map((location) => {
                    const code = location.id.toUpperCase();
                    const hasIntel = countryIntel.some((country) => country.countryCode === code);
                    const isSelected = code === selectedCountry?.countryCode;

                    return (
                      <path
                        key={location.id}
                        d={location.path}
                        className={`${styles.countryPath} ${isSelected ? styles.countryPathSelected : ""} ${hasIntel ? styles.countryPathActive : ""}`}
                        onClick={() => setSelectedCountryCode(code)}
                      />
                    );
                  })}
                </g>
              </svg>

              {mapCountries.map((country) => (
                <button
                  key={country.countryCode}
                  type="button"
                  className={styles.marker}
                  style={{ left: `${country.coordinates.x}%`, top: `${country.coordinates.y}%` }}
                  onClick={() => setSelectedCountryCode(country.countryCode)}
                >
                  <span
                    className={`${styles.pulse} ${
                      country.topicGroups.some((group) => group.sentiment === "negative")
                        ? styles.negative
                        : country.topicGroups.some((group) => group.sentiment === "positive")
                          ? styles.positive
                          : styles.neutral
                    }`}
                    style={{ width: markerSize(country.articleCount), height: markerSize(country.articleCount) }}
                  >
                    {country.topicGroups.length}
                  </span>
                </button>
              ))}
            </div>

            {selectedGroup ? (
              <article
                className={styles.focusCard}
                style={{ left: cardPosition.x, top: cardPosition.y }}
                onPointerDown={handleCardPointerDown}
              >
                <p className={styles.eyebrow}>Selected Topic</p>
                <h2 className={styles.focusHeadline}>
                  {selectedWorldCountry?.name ?? selectedGroup.countryCode} · {selectedGroup.topic}
                </h2>
                <p className={styles.focusSummary}>{selectedGroup.summary}</p>
                <div className={styles.metaRow}>
                  <span className={styles.pill}>{selectedGroup.region}</span>
                  <span className={styles.pill}>{selectedGroup.articleCount} articles</span>
                  <span className={styles.pill}>{selectedGroup.sentiment}</span>
                </div>
                <div className={styles.insightBox}>
                  <p className={styles.insightLabel}>Agent Workflow</p>
                  <p className={styles.insightText}>Review grouped evidence, then ask the LLM for a course of action grounded in these articles only.</p>
                </div>
                <div className={styles.focusActions}>
                  <button type="button" className={styles.primaryButton} onClick={requestRecommendation} disabled={recommendationLoading}>
                    {recommendationLoading ? "Consulting LLM..." : "Recommend Course Of Action"}
                  </button>
                  <Link className={styles.filterReset} href={`/events/live-${selectedGroup.id}`}>
                    Inspect Sources
                  </Link>
                </div>
                {recommendation ? (
                  <div className={styles.recommendationBox}>
                    <p className={styles.insightLabel}>Agent Recommendation</p>
                    <p className={styles.recommendationHeadline}>
                      {recommendation.recommendation} · {recommendation.confidence}
                    </p>
                    <p className={styles.insightText}>{recommendation.summary}</p>
                    {recommendation.reasoning.length > 0 ? (
                      <ul className={styles.recommendationList}>
                        {recommendation.reasoning.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
              </article>
            ) : null}
          </div>
        </section>

        <aside className={`${styles.commandRail} ${!railOpen ? styles.commandRailClosed : ""}`}>
          <button className={styles.railToggle} type="button" onClick={() => setRailOpen((open) => !open)}>
            {railOpen ? "Hide Rail" : "Open Rail"}
          </button>
          <header className={styles.railHeader}>
            <p className={styles.eyebrow}>Operator Rail</p>
            <h2 className={styles.railTitle}>{selectedWorldCountry?.name ?? "Country View"}</h2>
            <p className={styles.railSubtitle}>
              {selectedCountry
                ? `${selectedCountry.topicGroups.length} grouped topics built from retrieved articles.`
                : "Select a country to inspect grouped topics."}
            </p>
          </header>
          <div className={styles.railContent}>
            {selectedCountry ? (
              <div className={styles.sectionBody}>
                {selectedCountry.topicGroups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    className={`${styles.topicCard} ${selectedGroup?.id === group.id ? styles.topicCardActive : ""}`}
                    onClick={() => {
                      setSelectedCountryCode(group.countryCode);
                      setSelectedTopic(group.topic);
                    }}
                  >
                    <div className={styles.topicCardHeader}>
                      <p className={styles.topicCardTitle}>{group.topic}</p>
                      <span className={styles.topicCardCount}>{group.articleCount} articles</span>
                    </div>
                    <p className={styles.cardCopy}>{group.summary}</p>
                    <div className={styles.topicArticleList}>
                      {group.articles.slice(0, 3).map((article) => (
                        <a key={article.id} className={styles.topicArticle} href={article.url} target="_blank" rel="noreferrer">
                          <span>{article.title}</span>
                          <small>{article.source}</small>
                        </a>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className={styles.sectionBody}>
                <div className={styles.actionCard}>
                  <h3 className={styles.cardTitle}>No country selected</h3>
                  <p className={styles.cardCopy}>Choose a country on the map to inspect grouped coverage by topic.</p>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
