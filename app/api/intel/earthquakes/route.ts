import { NextResponse } from "next/server";
import { usgsAdapter } from "@/lib/providers";

export async function GET() {
  try {
    return NextResponse.json({
      events: await usgsAdapter.fetchEvents()
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch USGS event feed" }, { status: 502 });
  }
}
