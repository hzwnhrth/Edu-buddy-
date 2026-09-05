import { jsonOk } from "@/lib/api";
import { getRuntimeStatus } from "@/lib/env";

// Public diagnostics endpoint: which AI and store backends are actually
// wired up. No profile header required, and no secret values are returned.
export async function GET() {
  return jsonOk(getRuntimeStatus());
}
