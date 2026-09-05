import { getFirestore } from "firebase-admin/firestore";
import { z } from "zod";
import { generateJson, resolveModel } from "@/lib/ai/gemini/client";
import { getEnv } from "@/lib/env";
import { getStore } from "@/lib/store";
import { getRtdb } from "@/lib/store/chat";

// Verifies both optional secrets against the real services they configure,
// and prints the model Gemini would use. Safe to run with neither secret
// set: those checks are reported as SKIPPED, not FAIL, so this script is
// useful in plain mock-and-memory mode too. Exits 1 only if something that
// IS configured turns out not to work. Nothing this script does is ever
// deleted: the Firestore check only writes and reads back one fixed
// document, and the Realtime Database check only writes and reads back one
// fixed path, both simply overwritten on every run.

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

// 1. GEMINI_API_KEY present.
function checkGeminiKeyPresent(): boolean {
  const key = getEnv().geminiApiKey;
  if (!key) {
    report("GEMINI_API_KEY present", "SKIPPED", "not set, the app uses mock AI");
    return false;
  }
  report("GEMINI_API_KEY present", "OK");
  return true;
}

// 2. Gemini reachable: resolve a model, then ask it for a trivial JSON reply.
async function checkGeminiReachable(hasKey: boolean): Promise<void> {
  if (!hasKey) {
    report("Gemini reachable", "SKIPPED", "GEMINI_API_KEY not set");
    return;
  }
  try {
    const model = await resolveModel();
    const pingSchema = z.object({ ok: z.literal(true) });
    await generateJson({
      prompt: 'Reply with only this exact JSON object and nothing else: {"ok": true}',
      schema: pingSchema,
    });
    report("Gemini reachable", "OK", `model ${model}`);
  } catch (error) {
    report("Gemini reachable", "FAIL", messageOf(error));
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

// 4. Firestore reachable: write { checkedAt, by } to the fixed document
// _health/check, read it back, and confirm checkedAt matches what was just
// written. The document is simply overwritten every run, never deleted, so
// this is safe to run as often as needed and leaves no cleanup step. The
// Store interface has no generic "write this document" method (route code
// never needs one), so this reaches into firebase-admin directly for the
// write and the read, the same way the project's other scripts and Store
// implementations do. store.getMaterial() below is an ordinary read against
// a made-up id (materials never use ids like this, so it always resolves to
// null); its only purpose is to run the Store's own lazy Firestore app
// initialisation before this function drops past the Store interface and
// into firebase-admin directly.
async function checkFirestoreReachable(hasJson: boolean): Promise<void> {
  if (!hasJson) {
    report("Firestore reachable", "SKIPPED", "FIREBASE_SERVICE_ACCOUNT_JSON not set or invalid");
    return;
  }
  try {
    const store = getStore();
    await store.getMaterial("_health_check_init_probe");

    const checkedAt = new Date().toISOString();
    const ref = getFirestore().collection("_health").doc("check");
    await ref.set({ checkedAt, by: "npm run check" });

    const snap = await ref.get();
    if (snap.data()?.checkedAt !== checkedAt) {
      throw new Error("checkedAt did not read back with the value just written");
    }
    report("Firestore reachable", "OK");
  } catch (error) {
    report("Firestore reachable", "FAIL", messageOf(error));
  }
}

// 5. Realtime Database reachable: only checked when BOTH the service
// account and FIREBASE_DATABASE_URL are set, since that is exactly the
// combination under which chat history uses it. Writes { checkedAt, by } to
// the fixed path _health/check and reads the value straight back; the write
// overwrites whatever the last run left, and nothing is ever deleted.
// getRtdb() (src/lib/store/chat.ts) owns the admin app initialisation and
// the URL wiring, so this exercises the same path /api/chat uses.
async function checkRtdbReachable(hasJson: boolean): Promise<void> {
  const url = getEnv().firebaseDatabaseUrl;
  if (!hasJson || !url) {
    report(
      "Realtime Database reachable",
      "SKIPPED",
      !url
        ? "FIREBASE_DATABASE_URL not set, chat history uses the in-memory store"
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
  const hasKey = checkGeminiKeyPresent();
  await checkGeminiReachable(hasKey);

  const hasJson = checkFirebaseJsonPresent();
  await checkFirestoreReachable(hasJson);
  await checkRtdbReachable(hasJson);

  process.exit(hasFailure ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
