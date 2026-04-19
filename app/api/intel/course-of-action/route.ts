import { NextResponse } from "next/server";
import { getCourseOfAction } from "@/lib/live-intel";
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const countryCode = typeof body?.countryCode === "string" ? body.countryCode.toUpperCase() : "";
    const topic = body?.topic;

    if (!countryCode || !isTopic(topic)) {
      return NextResponse.json({ error: "countryCode and topic are required." }, { status: 400 });
    }

    return NextResponse.json(await getCourseOfAction(countryCode, topic));
  } catch {
    return NextResponse.json({ error: "Failed to build course of action." }, { status: 502 });
  }
}
