import { NextResponse } from "next/server";
import { getLiveEventClusters } from "@/lib/live-intel";

export async function GET() {
  try {
    return NextResponse.json(await getLiveEventClusters());
  } catch {
    return NextResponse.json({ error: "Failed to build live event clusters" }, { status: 502 });
  }
}
