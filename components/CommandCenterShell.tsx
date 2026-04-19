"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "@/app/page.module.css";
import { DashboardPayload, EventCluster } from "@/lib/types";
import { WorldLocation } from "@/lib/world-map";

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
  const [selectedId, setSelectedId] = useState(events[0]?.id);
  const [selectedCountryCode, setSelectedCountryCode] = useState("ALL");
  const [topicFilter, setTopicFilter] = useState<EventCluster["topic"] | "ALL">("ALL");
  const [sentimentFilter, setSentimentFilter] = useState<EventCluster["sentiment"] | "ALL">("ALL");
  const [railOpen, setRailOpen] = useState(true);
  const [cardPosition, setCardPosition] = useState({ x: 24, y: 360 });
  const [mapTransform, setMapTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [liveEvents, setLiveEvents] = useState<EventCluster[]>([]);
  const [liveMeta, setLiveMeta] = useState<{ relevantArticleCount: number; ingestedArticleCount: number } | null>(null);

  const activeEvents = liveEvents.length > 0 ? liveEvents : events;
  const visibleEvents = useMemo(() => {
    return activeEvents.filter((event) => {
      if (selectedCountryCode && event.countryCode !== selectedCountryCode && selectedCountryCode !== "ALL") {
        return false;
      }
      if (topicFilter !== "ALL" && event.topic !== topicFilter) return false;
      if (sentimentFilter !== "ALL" && event.sentiment !== sentimentFilter) return false;
      return true;
    });
  }, [activeEvents, selectedCountryCode, sentimentFilter, topicFilter]);

  const selectedEvent = visibleEvents.find((event) => event.id === selectedId) ?? visibleEvents[0] ?? activeEvents[0];
  const selectedCountry = countries.find((country) => country.id.toUpperCase() === selectedEvent?.countryCode);

  useEffect(() => {
    if (!visibleEvents.some((event) => event.id === selectedId) && visibleEvents[0]) {
      setSelectedId(visibleEvents[0].id);
    }
  }, [selectedId, visibleEvents]);

  useEffect(() => {
    async function loadLiveEvents() {
      try {
        const response = await fetch("/api/intel/live-events");
        if (!response.ok) {
          return;
        }

        const payload = await response.json();
        setLiveEvents(payload.events ?? []);
        setLiveMeta(payload.meta ?? null);
      } catch {
        setLiveEvents([]);
        setLiveMeta(null);
      }
    }

    void loadLiveEvents();
  }, []);

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

      setMapTransform((current) => ({
        ...current,
        x: dragState.current?.originX ?? current.x + deltaX,
        y: dragState.current?.originY ?? current.y + deltaY
      }));
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
  }, []);

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

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.topBar}>
          <div className={styles.brandBlock}>
            <p className={styles.eyebrow}>Command Center</p>
            <h1 className={styles.brandTitle}>Live World Risk Map</h1>
            <p className={styles.brandSubtitle}>Interactive map for high-signal geopolitical and market events.</p>
          </div>

          <div className={styles.statusBlock}>
            <p className={styles.eyebrow}>Status</p>
            <p className={styles.statusText}>{visibleEvents.length} visible stories</p>
            <p className={styles.statusMeta}>
              {liveMeta
                ? `${liveMeta.relevantArticleCount}/${liveMeta.ingestedArticleCount} articles passed live relevance`
                : "Recovered baseline build"}
            </p>
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
                <span>Country</span>
                <select value={selectedCountryCode} onChange={(event) => setSelectedCountryCode(event.target.value)}>
                  <option value="ALL">All countries</option>
                  {countries
                    .filter((country) => activeEvents.some((event) => event.countryCode === country.id.toUpperCase()))
                    .map((country) => (
                      <option key={country.id} value={country.id.toUpperCase()}>
                        {country.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className={styles.filterField}>
                <span>Topic</span>
                <select
                  value={topicFilter}
                  onChange={(event) => setTopicFilter(event.target.value as EventCluster["topic"] | "ALL")}
                >
                  <option value="ALL">All topics</option>
                  {[...new Set(activeEvents.map((event) => event.topic))].map((topic) => (
                    <option key={topic} value={topic}>
                      {topic}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.filterField}>
                <span>Sentiment</span>
                <select
                  value={sentimentFilter}
                  onChange={(event) => setSentimentFilter(event.target.value as EventCluster["sentiment"] | "ALL")}
                >
                  <option value="ALL">All sentiment</option>
                  <option value="negative">Negative</option>
                  <option value="neutral">Neutral</option>
                  <option value="positive">Positive</option>
                </select>
              </label>
            </div>
          </div>

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
            </div>

            {selectedEvent ? (
              <article
                className={styles.focusCard}
                style={{ left: cardPosition.x, top: cardPosition.y }}
                onPointerDown={handleCardPointerDown}
              >
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

        <aside className={`${styles.commandRail} ${!railOpen ? styles.commandRailClosed : ""}`}>
          <button className={styles.railToggle} type="button" onClick={() => setRailOpen((open) => !open)}>
            {railOpen ? "Hide Rail" : "Open Rail"}
          </button>
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
