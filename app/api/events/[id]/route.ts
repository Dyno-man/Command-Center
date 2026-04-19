import { NextResponse } from "next/server";
import { getEventDetail } from "@/lib/queries";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const detail = await getEventDetail(id);

  if (!detail) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json(detail);
}
