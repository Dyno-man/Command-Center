import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    assets: [
      { id: "bitcoin", symbol: "btc", name: "Bitcoin", priceUsd: 0, change24h: 0 },
      { id: "ethereum", symbol: "eth", name: "Ethereum", priceUsd: 0, change24h: 0 }
    ]
  });
}
