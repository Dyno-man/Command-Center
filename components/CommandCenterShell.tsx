"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "@/app/page.module.css";
import { DashboardPayload, EventCluster } from "@/lib/types";
import { WorldLocation } from "@/lib/world-map";

const interfaceModes = [
  { key: "WORLD", label: "World", description: "All live stories and country selection." },
  { key: "GEO", label: "Geo", description: "Country-first view for regional browsing." },
  { key: "MARKETS", label: "Markets", description: "Only stories with the strongest asset impact." },
  { key: "RISK", label: "Risk", description: "Highest urgency and negative developments." }
] as const;

type InterfaceMode = (typeof interfaceModes)[number]["key"];

function markerSize(impactScore: number) {
  return Math.max(24, Math.min(44, Math.round(impactScore * 0.34)));
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
  const [selectedId, setSelectedId] = useState(events[0]?.id);
  const [selectedCountryCode, setSelectedCountryCode] = useState(events[0]?.countryCode ?? "YE");
  const [activeMode, setActiveMode] = useState<InterfaceMode>("WORLD");
  const [topicFilter, setTopicFilter] = useState<EventCluster["topic"] | "ALL">("ALL");
  const [sentimentFilter, setSentimentFilter] = useState<EventCluster["sentiment"] | "ALL">("ALL");

  const modeEvents = useMemo(() => {
    if (activeMode === "GEO") {
      const countryEvents = events.filter((event) => event.countryCode === selectedCountryCode);
      return countryEvents.length > 0 ? countryEvents : events;
    }
    if (activeMode === "MARKETS") {
      return events.filter((event) => event.affectedAssets.length > 0);
    }
    if (activeMode === "RISK") {
      return events.filter((event) => event.sentiment === "negative" || event.impactScore >= 80);
    }
    return events;
  }, [activeMode, events, selectedCountryCode]);

  const visibleEvents = useMemo(() => {
    return modeEvents.filter((event) => {
      if (topicFilter !== "ALL" && event.topic !== topicFilter) return false;
      if (sentimentFilter !== "ALL" && event.sentiment !== sentimentFilter) return false;
      return true;
    });
  }, [modeEvents, sentimentFilter, topicFilter]);

  const selectedEvent = visibleEvents.find((event) => event.id === selectedId) ?? visibleEvents[0] ?? events[0];
  const selectedMode = interfaceModes.find((mode) => mode.key === activeMode) ?? interfaceModes[0];
  const selectedCountry = countries.find((country) => country.id.toUpperCase() === selectedEvent?.countryCode);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.topBar}>
          <div className={styles.brandBlock}>
            <p className={styles.eyebrow}>Command Center</p>
            <h1 className={styles.brandTitle}>Live World Risk Map</h1>
            <p className={styles.brandSubtitle}>{selectedMode.description}</p>
            <div className={styles.modeStrip}>
              {interfaceModes.map((mode) => (
                <button
                  key={mode.key}
                  type="button"
                  className={`${styles.modeButton} ${activeMode === mode.key ? styles.modeButtonActive : ""}`}
                  onClick={() => setActiveMode(mode.key)}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.statusBlock}>
            <p className={styles.eyebrow}>Status</p>
            <p className={styles.statusText}>{visibleEvents.length} visible stories</p>
            <p className={styles.statusMeta}>Recovered baseline build</p>
          </div>
        </div>

        <section className={styles.mapStage}>
          <div className={styles.mapBackdrop} />
          <div className={styles.mapGrid} />

          <div className={styles.filterDock}>
            <div className={styles.filterHeader}>
              <p className={styles.eyebrow}>Map Filters</p>
              <button
                type="button"
                className={styles.filterReset}
                onClick={() => {
                  setTopicFilter("ALL");
                  setSentimentFilter("ALL");
                }}
              >
                Reset
              </button>
            </div>
            <div className={styles.filterGrid}>
              <label className={styles.filterField}>
                <span>Topic</span>
                <select value={topicFilter} onChange={(event) => setTopicFilter(event.target.value as EventCluster["topic"] | "ALL")}>
                  <option value="ALL">All topics</option>
                  {[...new Set(events.map((event) => event.topic))].map((topic) => (
                    <option key={topic} value={topic}>
                      {topic}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.filterField}>
                <span>Sentiment</span>
                <select value={sentimentFilter} onChange={(event) => setSentimentFilter(event.target.value as EventCluster["sentiment"] | "ALL")}>
                  <option value="ALL">All sentiment</option>
                  <option value="negative">Negative</option>
                  <option value="neutral">Neutral</option>
                  <option value="positive">Positive</option>
                </select>
              </label>
            </div>
          </div>

          <div className={styles.mapViewport}>
            <svg className={styles.mapSvg} viewBox={worldViewBox} aria-label="Interactive world map">
              <g>
                {countries.map((location) => {
                  const code = location.id.toUpperCase();
                  const isSelected = code === selectedEvent?.countryCode;
                  const isActive = visibleEvents.some((event) => event.countryCode === code);

                  return (
                    <path
                      key={location.id}
                      d={location.path}
                      className={`${styles.countryPath} ${isSelected ? styles.countryPathSelected : ""} ${isActive ? styles.countryPathActive : ""}`}
                      onClick={() => setSelectedCountryCode(code)}
                    />
                  );
                })}
              </g>
            </svg>

            {visibleEvents.map((event) => (
              <button
                key={event.id}
                type="button"
                className={styles.marker}
                style={{ left: `${event.coordinates.x}%`, top: `${event.coordinates.y}%` }}
                onClick={() => setSelectedId(event.id)}
              >
                <span
                  className={`${styles.pulse} ${
                    event.sentiment === "negative" ? styles.negative : event.sentiment === "positive" ? styles.positive : styles.neutral
                  }`}
                  style={{ width: markerSize(event.impactScore), height: markerSize(event.impactScore) }}
                >
                  {event.impactScore}
                </span>
              </button>
            ))}

            {selectedEvent ? (
              <article className={styles.focusCard}>
                <p className={styles.eyebrow}>Selected Event</p>
                <h2 className={styles.focusHeadline}>{selectedEvent.headline}</h2>
                <p className={styles.focusSummary}>
                  <strong>{selectedCountry?.name ?? selectedEvent.countryCode}</strong>
                  {" • "}
                  {selectedEvent.whyItMatters}
                </p>
                <div className={styles.metaRow}>
                  <span className={styles.pill}>{selectedEvent.region}</span>
                  <span className={styles.pill}>{selectedEvent.topic}</span>
                  <span className={styles.pill}>Impact {selectedEvent.impactScore}</span>
                </div>
                <div className={styles.insightBox}>
                  <p className={styles.insightLabel}>Actionable Insight</p>
                  <p className={styles.insightText}>{selectedEvent.nextToWatch}</p>
                </div>
                <div className={styles.focusActions}>
                  <Link className={styles.primaryButton} href={`/events/${selectedEvent.id}`}>
                    Inspect Event
                  </Link>
                </div>
              </article>
            ) : null}
          </div>
        </section>

        <aside className={styles.commandRail}>
          <header className={styles.railHeader}>
            <p className={styles.eyebrow}>Operator Rail</p>
            <h2 className={styles.railTitle}>Actions, Briefings, Alerts</h2>
            <p className={styles.railSubtitle}>Recovered baseline for continuing work.</p>
          </header>
          <div className={styles.railContent}>
            <div className={styles.sectionBody}>
              {dashboard.actionableInsights.map((insight) => (
                <div key={insight.id} className={styles.actionCard}>
                  <h3 className={styles.cardTitle}>{insight.title}</h3>
                  <p className={styles.cardCopy}>{insight.recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
