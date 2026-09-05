// Browser-only helpers. Nothing here imports server code, and this module is
// meant to be reached only from client components so it stays out of any
// server bundle; it does not need its own "use client" directive to do that.

const PROFILE_ID_KEY = "edubuddy.profileId";

// Reads the browser's profile id from localStorage, creating and persisting
// a fresh one on first use. This id is EduBuddy's only notion of identity:
// there is no login, so whoever holds it in their browser owns the data.
export function getProfileId(): string {
  const existing = window.localStorage.getItem(PROFILE_ID_KEY);
  if (existing) {
    return existing;
  }
  const id = crypto.randomUUID();
  window.localStorage.setItem(PROFILE_ID_KEY, id);
  return id;
}

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

// Calls a server API route with the profile id header every server route
// expects, sending and receiving JSON. Throws a plain Error with the
// server's "error" message (or the HTTP status text) on any non-2xx
// response, so callers can show it directly or catch it.
export async function apiFetch<T>(path: string, init?: ApiFetchInit): Promise<T> {
  const response = await fetch(path, {
    method: init?.method ?? "GET",
    headers: {
      "content-type": "application/json",
      "x-profile-id": getProfileId(),
    },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(isErrorPayload(data) ? data.error : response.statusText);
  }

  return data as T;
}
