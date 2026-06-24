import { NextResponse } from "next/server";
import { getSiteData } from "@/lib/runtime-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getSiteData();
  return NextResponse.json(
    { data },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
