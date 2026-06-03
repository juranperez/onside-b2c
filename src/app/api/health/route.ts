import { NextResponse } from "next/server";
import { readDb } from "@/lib/db/server";
import { checkDb } from "@/lib/db/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const res = await checkDb(readDb());
  return NextResponse.json(res, { status: res.ok ? 200 : 503 });
}
