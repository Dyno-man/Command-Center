import { NextResponse } from "next/server";
import { getAgentPromptDocs } from "@/lib/agent-docs";
import { queryIntelHistory } from "@/lib/intel-store";
import { getCountryTopicGroup } from "@/lib/live-intel";
import { Topic } from "@/lib/types";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function isTopic(value: unknown): value is Topic {
  return (
    value === "Energy" ||
    value === "Defense" ||
    value === "Trade" ||
    value === "Monetary Policy" ||
    value === "Technology" ||
    value === "Shipping"
  );
}

function normalizeMessages(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as ChatMessage[];
  }

  return value
    .filter(
      (entry): entry is ChatMessage =>
        typeof entry === "object" &&
        entry !== null &&
        (entry as { role?: unknown }).role !== undefined &&
        ((entry as { role?: unknown }).role === "user" || (entry as { role?: unknown }).role === "assistant") &&
        typeof (entry as { content?: unknown }).content === "string"
    )
    .slice(-12);
}

function buildFollowUpPrompt(input: {
  countryCode: string;
  topic: Topic;
  question: string;
  currentGroup: NonNullable<Awaited<ReturnType<typeof getCountryTopicGroup>>>;
  history: ReturnType<typeof queryIntelHistory>;
}) {
  const currentSources = input.currentGroup.articles
    .slice(0, 6)
    .map((article, index) => `${index + 1}. [current] ${article.title} | ${article.source} | ${article.publishedAt}`)
    .join("\n");

  const historicalSources = input.history.articles
    .slice(0, 12)
    .map((article, index) => `${index + 1}. [history] ${article.title} | ${article.source} | ${article.publishedAt} | seen ${article.seenCount}x`)
    .join("\n");

  const historySummary = [
    `Historical matches: ${input.history.meta.totalMatches}`,
    `Accepted historical matches: ${input.history.meta.acceptedCount}`,
    `Providers: ${input.history.meta.byProvider.map((entry) => `${entry.provider} (${entry.count})`).join(", ") || "none"}`,
    `Lanes: ${input.history.meta.byLane.map((entry) => `${entry.lane} (${entry.count})`).join(", ") || "none"}`
  ].join("\n");

  return [
    "You are now in follow-up investigation mode for an existing country/topic workspace.",
    "Answer the user's question using the supplied current cluster and the selected historical context.",
    "Stay grounded in the retrieved evidence.",
    "If the evidence is insufficient, say what is missing.",
    "Prefer concise, analytical prose over rigid templates.",
    "Call out when a point is based on current-cluster evidence versus historical-pattern evidence.",
    "",
    `Country: ${input.countryCode}`,
    `Topic: ${input.topic}`,
    `Current cluster summary: ${input.currentGroup.summary}`,
    "",
    "Current retrieved articles:",
    currentSources || "None",
    "",
    "Historical context summary:",
    historySummary,
    "",
    "Historical retrieved articles:",
    historicalSources || "None",
    "",
    `User question: ${input.question}`
  ].join("\n");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const countryCode = typeof body?.countryCode === "string" ? body.countryCode.toUpperCase() : "";
    const topic = body?.topic;
    const question = typeof body?.question === "string" ? body.question.trim() : "";
    const messages = normalizeMessages(body?.messages);

    if (!countryCode || !isTopic(topic) || !question) {
      return NextResponse.json({ error: "countryCode, topic, and question are required." }, { status: 400 });
    }

    const currentGroup = await getCountryTopicGroup(countryCode, topic);
    if (!currentGroup) {
      return NextResponse.json({ error: "Country/topic group not found." }, { status: 404 });
    }

    const history = queryIntelHistory({
      countryCode,
      topic,
      provider: typeof body?.provider === "string" && body.provider ? body.provider : undefined,
      lane: typeof body?.lane === "string" && body.lane ? body.lane : undefined,
      acceptedOnly: body?.acceptedOnly === true,
      startDate: typeof body?.startDate === "string" && body.startDate ? body.startDate : undefined,
      endDate: typeof body?.endDate === "string" && body.endDate ? body.endDate : undefined,
      limit: typeof body?.limit === "number" ? body.limit : 40,
      offset: 0
    });

    const docs = await getAgentPromptDocs();
    const prompt = buildFollowUpPrompt({
      countryCode,
      topic,
      question,
      currentGroup,
      history
    });
    const model = process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        status: "not_configured",
        countryCode,
        topic,
        model,
        promptPreview: prompt,
        historyMeta: history.meta
      });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: docs.systemPrompt
          },
          ...messages.map((message) => ({
            role: message.role,
            content: message.content
          })),
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          status: "error",
          countryCode,
          topic,
          model,
          error: errorText.slice(0, 400),
          historyMeta: history.meta
        },
        { status: 502 }
      );
    }

    const payload = await response.json();
    const rawContent = payload?.choices?.[0]?.message?.content;
    const answer =
      typeof rawContent === "string"
        ? rawContent
        : Array.isArray(rawContent)
          ? rawContent
              .map((part: { type?: string; text?: string }) => (part?.type === "text" ? part.text ?? "" : ""))
              .join("")
          : JSON.stringify(rawContent);

    return NextResponse.json({
      status: "configured",
      countryCode,
      topic,
      model,
      answer,
      historyMeta: history.meta
    });
  } catch {
    return NextResponse.json({ error: "Failed to build follow-up chat response." }, { status: 502 });
  }
}
