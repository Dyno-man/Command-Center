import { NextResponse } from "next/server";
import { getEvents } from "@/lib/queries";

export async function GET() {
  return NextResponse.json({ events: getEvents() });
}
