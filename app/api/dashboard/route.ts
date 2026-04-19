import { NextResponse } from "next/server";
import { getDashboard } from "@/lib/queries";

export async function GET() {
  return NextResponse.json(getDashboard());
}
