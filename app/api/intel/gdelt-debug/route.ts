import { NextResponse } from "next/server";
import { getGdeltDebugSnapshot } from "@/lib/live-intel";

export async function GET() {
  try {
    return NextResponse.json(await getGdeltDebugSnapshot());
  } catch {
    return NextResponse.json({ error: "Failed to build GDELT debug snapshot." }, { status: 502 });
  }
}
