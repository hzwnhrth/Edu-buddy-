import { NextResponse } from "next/server";
import { getRuntimeStatus } from "@/lib/env";

// Public diagnostics endpoint: which AI and store backends are actually
// wired up. No profile header required, and no secret values are returned.
export async function GET() {
  // Keep the health check independent from authenticated route dependencies.
  // It must remain available when a Firebase Admin integration is unhealthy.
  return NextResponse.json(getRuntimeStatus());
}
