import { NextResponse } from "next/server";
import { getEvents } from "@/lib/queries";

export async function GET() {
  return NextResponse.json({
    markers: getEvents().map((event) => ({
      id: event.id,
      countryCode: event.countryCode,
      impactScore: event.impactScore,
      sentiment: event.sentiment,
      coordinates: event.coordinates
    }))
  });
}
