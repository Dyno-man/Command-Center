import { NextResponse } from "next/server";
import { coinGeckoAdapter, gdeltAdapter, rssAdapter, usgsAdapter } from "@/lib/providers";

export async function GET() {
  const health = await Promise.all([
    rssAdapter.healthCheck(),
    gdeltAdapter.healthCheck(),
    usgsAdapter.healthCheck(),
    coinGeckoAdapter.healthCheck()
  ]);

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    providers: health
  });
}
