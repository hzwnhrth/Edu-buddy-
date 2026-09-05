import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { checkIpLimit, LimitError } from "@/lib/limits";
import { getStore } from "@/lib/store";
import type { Store } from "@/lib/store/types";
import type { Profile } from "@/lib/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Thrown for any request that fails validation; withProfile turns this into
// a 400 response carrying the message as a readable explanation.
export class BadRequestError extends Error {}

// Route params for the App Router segment, resolved from its context promise.
type RouteParams = Record<string, string>;

interface RouteContext<Params extends RouteParams> {
  params: Promise<Params>;
}

export interface HandlerArgs<Params extends RouteParams = RouteParams> {
  request: NextRequest;
  profile: Profile;
  store: Store;
  params: Params;
}

export type RouteHandler<Params extends RouteParams = RouteParams> = (
  args: HandlerArgs<Params>
) => Promise<Response> | Response;

// Wraps an App Router route handler with the shared request pipeline: reads
// and validates the x-profile-id header, applies the per-IP rate limit from
// limits.ts, loads (or creates) the profile, then calls handler(). A
// LimitError becomes 429, a BadRequestError (typically from parseBody)
// becomes 400, and any other thrown error becomes a 500 with the real error
// logged to the server console instead of leaked to the client.
export function withProfile<Params extends RouteParams = RouteParams>(
  handler: RouteHandler<Params>
) {
  return async (request: NextRequest, context?: RouteContext<Params>): Promise<Response> => {
    try {
      const profileId = request.headers.get("x-profile-id") ?? "";
      if (!UUID_RE.test(profileId)) {
        return jsonError(400, "Missing or invalid profile id");
      }

      const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
      checkIpLimit(ip);

      const store = getStore();
      const profile = await store.getOrCreateProfile(profileId);
      const params = context ? await context.params : ({} as Params);

      return await handler({ request, profile, store, params });
    } catch (error) {
      if (error instanceof LimitError) {
        return jsonError(429, error.message);
      }
      if (error instanceof BadRequestError) {
        return jsonError(400, error.message);
      }
      console.error(error);
      return jsonError(500, "Something went wrong");
    }
  };
}

// Reads and validates a JSON request body against a zod schema. Throws
// BadRequestError (caught by withProfile and turned into a 400) when the
// body is not valid JSON or fails the schema.
export async function parseBody<T>(request: NextRequest, schema: z.ZodType<T>): Promise<T> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw new BadRequestError("Request body must be valid JSON");
  }

  const result = schema.safeParse(json);
  if (!result.success) {
    const message = result.error.issues
      .map((issue) =>
        issue.path.length ? `${issue.path.join(".")}: ${issue.message}` : issue.message
      )
      .join("; ");
    throw new BadRequestError(message || "Invalid request body");
  }

  return result.data;
}

export function jsonOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function jsonError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
