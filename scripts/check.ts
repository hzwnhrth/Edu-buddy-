import { z } from "zod";
import { generateJson, resolveModel } from "@/lib/ai/openrouter/client";
import { getEnv } from "@/lib/env";
import { getRtdb } from "@/lib/store/chat";

// Verifies both optional secrets against the real services they configure,
// and prints the model OpenRouter would use. Safe to run with neither secret
// set: those checks are reported as SKIPPED, not FAIL, so this script is
// useful in plain mock-and-memory mode too. Exits 1 only if something that
// IS configured turns out to not work. Nothing this script does is ever
// deleted: the Realtime Database check only writes and reads back one fixed
// path, simply overwritten on every run.

type Result = "OK" | "FAIL" | "SKIPPED";

let hasFailure = false;

function report(label: string, result: Result, detail?: string): void {
  console.log(`${result}: ${label}${detail ? ` (${detail})` : ""}`);
  if (result === "FAIL") {
    hasFailure = true;
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// 1. OPENROUTER_API_KEY present.
function checkOpenRouterKeyPresent(): boolean {
  const key = getEnv().openrouterApiKey;
  if (!key) {
    report("OPENROUTER_API_KEY present", "SKIPPED", "not set, the app uses mock AI");
    return false;
  }
  report("OPENROUTER_API_KEY present", "OK");
  return true;
}

// 2. OpenRouter reachable: resolve a model, then ask it for a trivial JSON reply.
async function checkOpenRouterReachable(hasKey: boolean): Promise<void> {
  if (!hasKey) {
    report("OpenRouter reachable", "SKIPPED", "OPENROUTER_API_KEY not set");
    return;
  }
  try {
    const model = resolveModel();
    const pingSchema = z.object({ ok: z.literal(true) });
    await generateJson({
      prompt: 'Reply with only this exact JSON object and nothing else: {"ok": true}',
      schema: pingSchema,
    });
    report("OpenRouter reachable", "OK", `model ${model}`);
  } catch (error) {
    report("OpenRouter reachable", "FAIL", messageOf(error));
  }
}

// 3. FIREBASE_SERVICE_ACCOUNT_JSON present and parseable.
function checkFirebaseJsonPresent(): boolean {
  const raw = getEnv().firebaseServiceAccountJson;
  if (!raw) {
    report("FIREBASE_SERVICE_ACCOUNT_JSON present", "SKIPPED", "not set, the app uses an in-memory store");
    return false;
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      throw new Error("missing project_id, client_email or private_key");
    }
    report("FIREBASE_SERVICE_ACCOUNT_JSON present", "OK", "parsed as JSON");
    return true;
  } catch (error) {
    report("FIREBASE_SERVICE_ACCOUNT_JSON present", "FAIL", `set but invalid: ${messageOf(error)}`);
    return false;
  }
}

// 4. Realtime Database reachable: only checked when BOTH the service
// account and FIREBASE_DATABASE_URL are set, since that is exactly the
// combination under which the store (materials, quizzes, attempts, progress
// and chat history) uses it. Writes { checkedAt, by } to the fixed path
// _health/check and reads the value straight back; the write overwrites
// whatever the last run left, and nothing is ever deleted. getRtdb()
// (src/lib/store/chat.ts) owns the admin app initialisation and the URL
// wiring, so this exercises the same path the Store and /api/chat use.
async function checkRtdbReachable(hasJson: boolean): Promise<void> {
  const url = getEnv().firebaseDatabaseUrl;
  if (!hasJson || !url) {
    report(
      "Realtime Database reachable",
      "SKIPPED",
      !url
        ? "FIREBASE_DATABASE_URL not set, the app uses an in-memory store"
        : "FIREBASE_SERVICE_ACCOUNT_JSON not set or invalid"
    );
    return;
  }
  try {
    const db = getRtdb();
    const checkedAt = new Date().toISOString();
    const ref = db.ref("_health/check");
    await ref.set({ checkedAt, by: "npm run check" });

    const snap = await ref.get();
    if (snap.val()?.checkedAt !== checkedAt) {
      throw new Error("checkedAt did not read back with the value just written");
    }
    report("Realtime Database reachable", "OK");
  } catch (error) {
    report("Realtime Database reachable", "FAIL", messageOf(error));
  }
}

async function main(): Promise<void> {
  const hasKey = checkOpenRouterKeyPresent();
  await checkOpenRouterReachable(hasKey);

  const hasJson = checkFirebaseJsonPresent();
  await checkRtdbReachable(hasJson);

  process.exit(hasFailure ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
