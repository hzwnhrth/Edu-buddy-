import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { checkIpLimit, LimitError } from "@/lib/limits";
import { authenticateRequest, AuthError, type AuthenticatedUser, type UserRole } from "@/lib/auth";
import { getStore } from "@/lib/store";
import type { Store } from "@/lib/store/types";
import type { Profile } from "@/lib/types";

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
  identity: AuthenticatedUser;
  store: Store;
  params: Params;
}

export type RouteHandler<Params extends RouteParams = RouteParams> = (
  args: HandlerArgs<Params>
) => Promise<Response> | Response;

// Wraps an App Router route handler with the shared request pipeline. The
// Firebase ID token is verified before its UID is used as the profile ID.
export function withProfile<Params extends RouteParams = RouteParams>(
  handler: RouteHandler<Params>
) {
  return async (request: NextRequest, context?: RouteContext<Params>): Promise<Response> => {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    try {
      checkIpLimit(ip);

      const identity = await authenticateRequest(request.headers.get("authorization"));
      const store = getStore();
      let profile = await store.getOrCreateProfile(identity.uid);
      const params = context ? await context.params : ({} as Params);

      // The name comes from Firebase's verified token, never a browser header.
      const displayName = identity.displayName?.trim().slice(0, 80) || null;
      if (displayName && displayName !== profile.displayName) {
        await store.updateProfile(identity.uid, { displayName });
        profile = { ...profile, displayName };
      }

      return await handler({ request, profile, identity, store, params });
    } catch (error) {
      if (error instanceof AuthError) {
        return jsonError(error.status, error.message);
      }
      if (error instanceof LimitError) {
        console.warn(`rate limit reached for ip "${ip}": ${error.message}`);
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

// Role claims are assigned only through the Firebase Admin SDK. This keeps
// teacher and admin access out of browser-controlled signup state.
export function withRole<Params extends RouteParams = RouteParams>(
  role: UserRole,
  handler: RouteHandler<Params>
) {
  return withProfile(async (args: HandlerArgs<Params>) => {
    if (args.identity.role !== role) {
      return jsonError(403, "You do not have permission to access this resource");
    }
    return handler(args);
  });
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
