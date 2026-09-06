// Browser-only helpers. Nothing here imports server code, and this module is
// meant to be reached only from client components so it stays out of any
// server bundle; it does not need its own "use client" directive to do that.

import { getFirebaseAuth } from "@/lib/firebase-client";

export interface ApiFetchInit {
  method?: string;
  body?: unknown;
}

function isErrorPayload(value: unknown): value is { error: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as { error: unknown }).error === "string"
  );
}

// Calls a server API route with the signed-in Firebase user's ID token.
// Throws a plain Error with the
// server's "error" message (or the HTTP status text) on any non-2xx
// response, so callers can show it directly or catch it.
export async function apiFetch<T>(path: string, init?: ApiFetchInit): Promise<T> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Sign in is required.");

  const response = await fetch(path, {
    method: init?.method ?? "GET",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${await user.getIdToken()}`,
    },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(isErrorPayload(data) ? data.error : response.statusText);
  }

  return data as T;
}
