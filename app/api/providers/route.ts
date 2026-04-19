import { NextResponse } from "next/server";
import { providerRegistry } from "@/lib/providers/provider-registry";

export async function GET() {
  return NextResponse.json({
    providers: providerRegistry
  });
}
