import { NextResponse } from "next/server";
import { getIntelStoreStats, queryIntelHistory } from "@/lib/intel-store";
import { Topic } from "@/lib/types";

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

function parseBoolean(value: string | null) {
  return value === "true" || value === "1";
}

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const topicParam = url.searchParams.get("topic");
    const topic = topicParam && isTopic(topicParam) ? topicParam : undefined;

    const history = queryIntelHistory({
      countryCode: url.searchParams.get("countryCode") ?? undefined,
      topic,
      provider: url.searchParams.get("provider") ?? undefined,
      lane: url.searchParams.get("lane") ?? undefined,
      acceptedOnly: parseBoolean(url.searchParams.get("acceptedOnly")),
      startDate: url.searchParams.get("startDate") ?? undefined,
      endDate: url.searchParams.get("endDate") ?? undefined,
      limit: parsePositiveInt(url.searchParams.get("limit"), 50),
      offset: parsePositiveInt(url.searchParams.get("offset"), 0)
    });

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      store: getIntelStoreStats(),
      ...history
    });
  } catch {
    return NextResponse.json({ error: "Failed to query historical intel store." }, { status: 502 });
  }
}
