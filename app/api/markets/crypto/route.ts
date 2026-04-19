import { NextResponse } from "next/server";
import { getLiveCryptoMarkets } from "@/lib/live-intel";

export async function GET() {
  try {
    return NextResponse.json({
      assets: await getLiveCryptoMarkets()
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch CoinGecko market feed" }, { status: 502 });
  }
}
