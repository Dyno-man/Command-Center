"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import styles from "@/app/follow-up.module.css";
import { Topic } from "@/lib/types";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type HistoryResponse = {
  generatedAt: string;
  store: {
    totalArticles: number;
    acceptedArticles: number;
    totalObservations: number;
    oldestFirstSeenAt?: string;
    newestLastSeenAt?: string;
  };
  articles: Array<{
    canonicalKey: string;
    title: string;
    source: string;
    provider: string;
    queryLane?: string;
    publishedAt: string;
    acceptedForAnalysis: boolean;
    seenCount: number;
    summary: string;
    url: string;
  }>;
  meta: {
    totalMatches: number;
    returnedCount: number;
    acceptedCount: number;
    byProvider: Array<{ provider: string; count: number }>;
    byLane: Array<{ lane: string; count: number }>;
  };
};

const presetOptions = [
  { label: "7D", value: "7" },
  { label: "30D", value: "30" },
  { label: "90D", value: "90" },
  { label: "All", value: "all" }
];

function buildStartDate(preset: string) {
  if (preset === "all") {
    return "";
  }

  const days = Number(preset);
  if (!Number.isFinite(days) || days <= 0) {
    return "";
  }

  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export function FollowUpWorkspace({
  countryCode,
  topic
}: {
  countryCode: string;
  topic: Topic;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `Follow-up workspace ready for ${countryCode} ${topic}. Ask a question and I will use the current topic group plus the historical context selected in the side panel.`
    }
  ]);
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [rangePreset, setRangePreset] = useState("30");
  const [provider, setProvider] = useState("");
  const [lane, setLane] = useState("");
  const [acceptedOnly, setAcceptedOnly] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      setHistoryLoading(true);
      try {
        const params = new URLSearchParams({
          countryCode,
          topic,
          limit: "24"
        });

        const startDate = buildStartDate(rangePreset);
        if (startDate) {
          params.set("startDate", startDate);
        }
        if (provider) {
          params.set("provider", provider);
        }
        if (lane) {
          params.set("lane", lane);
        }
        if (acceptedOnly) {
          params.set("acceptedOnly", "true");
        }

        const response = await fetch(`/api/intel/history?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Failed to load history");
        }

        setHistory(await response.json());
      } catch {
        setHistory(null);
      } finally {
        setHistoryLoading(false);
      }
    }

    void loadHistory();
  }, [acceptedOnly, countryCode, lane, provider, rangePreset, topic]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim()) {
      return;
    }

    const nextQuestion = question.trim();
    const nextMessages = [...messages, { role: "user" as const, content: nextQuestion }];
    setMessages(nextMessages);
    setQuestion("");
    setSending(true);

    try {
      const response = await fetch("/api/intel/follow-up-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          countryCode,
          topic,
          question: nextQuestion,
          messages: nextMessages,
          provider: provider || undefined,
          lane: lane || undefined,
          acceptedOnly,
          startDate: buildStartDate(rangePreset) || undefined,
          limit: 24
        })
      });

      const payload = await response.json();
      const content =
        payload.answer ??
        payload.error ??
        payload.promptPreview ??
        "No follow-up answer was returned.";

      setMessages((current) => [...current, { role: "assistant", content }]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "The follow-up chat route failed. Check the backend route and model configuration."
        }
      ]);
    } finally {
      setSending(false);
    }
  }

  const providerOptions = history?.meta.byProvider.map((entry) => entry.provider) ?? [];
  const laneOptions = history?.meta.byLane.map((entry) => entry.lane).filter((entry) => entry !== "unknown") ?? [];

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <div className={styles.sideSection}>
            <p className={styles.eyebrow}>Follow-Up Workspace</p>
            <h1 className={styles.title}>
              {countryCode} · {topic}
            </h1>
            <p className={styles.copy}>Adjust the historical slice, then ask targeted questions against the current cluster and retrieved history.</p>
            <Link className={styles.backLink} href="/">
              Back to map
            </Link>
          </div>

          <div className={styles.sideSection}>
            <p className={styles.sectionLabel}>Context Options</p>
            <div className={styles.presetRow}>
              {presetOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`${styles.presetButton} ${rangePreset === option.value ? styles.presetActive : ""}`}
                  onClick={() => setRangePreset(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <label className={styles.field}>
              <span>Provider</span>
              <select value={provider} onChange={(event) => setProvider(event.target.value)}>
                <option value="">All providers</option>
                {providerOptions.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Lane</span>
              <select value={lane} onChange={(event) => setLane(event.target.value)}>
                <option value="">All lanes</option>
                {laneOptions.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.checkboxRow}>
              <input type="checkbox" checked={acceptedOnly} onChange={(event) => setAcceptedOnly(event.target.checked)} />
              <span>Accepted articles only</span>
            </label>
          </div>

          <div className={styles.sideSection}>
            <p className={styles.sectionLabel}>Store Snapshot</p>
            {history ? (
              <div className={styles.metrics}>
                <div>
                  <strong>{history.meta.totalMatches}</strong>
                  <span>matches</span>
                </div>
                <div>
                  <strong>{history.meta.acceptedCount}</strong>
                  <span>accepted</span>
                </div>
                <div>
                  <strong>{history.store.totalArticles}</strong>
                  <span>stored</span>
                </div>
                <div>
                  <strong>{history.store.totalObservations}</strong>
                  <span>observations</span>
                </div>
              </div>
            ) : (
              <p className={styles.copy}>No historical context loaded.</p>
            )}
          </div>

          <div className={styles.sideSection}>
            <p className={styles.sectionLabel}>Attached History</p>
            <div className={styles.historyList}>
              {historyLoading ? <p className={styles.copy}>Loading history...</p> : null}
              {!historyLoading && history?.articles.length === 0 ? <p className={styles.copy}>No articles matched the current filter set.</p> : null}
              {history?.articles.map((article) => (
                <a key={article.canonicalKey} className={styles.historyCard} href={article.url} target="_blank" rel="noreferrer">
                  <strong>{article.title}</strong>
                  <span>
                    {article.source} · {article.provider}
                    {article.queryLane ? ` · ${article.queryLane}` : ""}
                  </span>
                  <small>
                    {new Date(article.publishedAt).toLocaleString()} · seen {article.seenCount}x · {article.acceptedForAnalysis ? "accepted" : "rejected"}
                  </small>
                </a>
              ))}
            </div>
          </div>
        </aside>

        <section className={styles.chatPanel}>
          <div className={styles.chatHeader}>
            <div>
              <p className={styles.eyebrow}>Topic Thread</p>
              <h2 className={styles.chatTitle}>Ask follow-up questions</h2>
            </div>
            <p className={styles.copy}>The agent will respond using the current topic group plus the selected historical slice.</p>
          </div>

          <div className={styles.thread}>
            {messages.map((message, index) => (
              <article key={`${message.role}-${index}`} className={`${styles.message} ${message.role === "user" ? styles.userMessage : styles.assistantMessage}`}>
                <p className={styles.messageRole}>{message.role === "user" ? "You" : "Agent"}</p>
                <div className={styles.messageBody}>
                  {message.content.split("\n").map((line, lineIndex) => (
                    <p key={lineIndex}>{line}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <form className={styles.composer} onSubmit={handleSubmit}>
            <textarea
              className={styles.input}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask what changed over the last 30 days, whether this is accelerating, which assets are directly exposed, or what would invalidate the thesis."
              rows={4}
            />
            <div className={styles.composerActions}>
              <span className={styles.composerHint}>Current filters are automatically attached to the chat context.</span>
              <button type="submit" className={styles.sendButton} disabled={sending || !question.trim()}>
                {sending ? "Thinking..." : "Send"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
