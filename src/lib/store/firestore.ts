import crypto from "node:crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import {
  getFirestore,
  type DocumentData,
  type Firestore,
  type Query,
} from "firebase-admin/firestore";
import { getEnv } from "@/lib/env";
import type {
  Attempt,
  Chunk,
  Material,
  Profile,
  Quiz,
  TopicProgress,
} from "@/lib/types";
import type { Store } from "@/lib/store/types";

interface ServiceAccountJson {
  project_id: string;
  client_email: string;
  private_key: string;
}

let cachedDb: Firestore | undefined;

// Lazily creates the admin app from FIREBASE_SERVICE_ACCOUNT_JSON, guarded so
// a hot reload or a second call never tries to initialize the app twice.
function getDb(): Firestore {
  if (cachedDb) {
    return cachedDb;
  }
  if (getApps().length === 0) {
    const raw = getEnv().firebaseServiceAccountJson;
    const parsed = JSON.parse(raw) as ServiceAccountJson;
    initializeApp({
      credential: cert({
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        // Service account JSON pasted into a single-line env var often carries
        // the key's newlines as the literal two characters "\n"; turn those
        // back into real newlines or the private key fails to parse.
        privateKey: parsed.private_key.replace(/\\n/g, "\n"),
      }),
    });
  }
  cachedDb = getFirestore();
  return cachedDb;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

// A profile seen more recently than this does not get lastSeenAt rewritten,
// so a busy session does not write on every request.
const LAST_SEEN_THROTTLE_MS = 600_000;

// Cloud Firestore implementation of Store, used when a Firebase service
// account is configured. All dates are stored as ISO strings, never as
// Firestore Timestamp values, so they round-trip through the shared types
// unchanged.
export class FirestoreStore implements Store {
  async getOrCreateProfile(id: string): Promise<Profile> {
    const ref = getDb().collection("profiles").doc(id);
    const now = new Date().toISOString();
    const snap = await ref.get();
    if (snap.exists) {
      const stored = { ...(snap.data() as Profile), id };
      const stale =
        !stored.lastSeenAt || Date.now() - Date.parse(stored.lastSeenAt) > LAST_SEEN_THROTTLE_MS;
      if (!stale) {
        return stored;
      }
      await ref.update({ lastSeenAt: now });
      return { ...stored, lastSeenAt: now };
    }
    const profile: Profile = {
      id,
      createdAt: now,
      lastSeenAt: now,
      latestFeedback: null,
      latestFeedbackAt: null,
      aiCallsToday: 0,
      aiCallsDate: todayUtc(),
    };
    await ref.set(profile);
    return profile;
  }

  async updateProfile(id: string, patch: Partial<Omit<Profile, "id">>): Promise<void> {
    await getDb().collection("profiles").doc(id).update({ ...patch });
  }

  async createMaterial(data: Omit<Material, "id">, chunks: Chunk[]): Promise<Material> {
    const db = getDb();
    const id = crypto.randomUUID();
    const material: Material = { ...data, id };
    const ref = db.collection("materials").doc(id);
    const batch = db.batch();
    batch.set(ref, material);
    for (const chunk of chunks) {
      batch.set(ref.collection("chunks").doc(String(chunk.order)), chunk);
    }
    await batch.commit();
    return material;
  }

  async getMaterial(id: string): Promise<Material | null> {
    const snap = await getDb().collection("materials").doc(id).get();
    return snap.exists ? (snap.data() as Material) : null;
  }

  async updateMaterial(
    id: string,
    patch: Partial<Omit<Material, "id" | "profileId">>
  ): Promise<void> {
    await getDb().collection("materials").doc(id).update({ ...patch });
  }

  async listMaterials(profileId: string): Promise<Material[]> {
    const snap = await getDb()
      .collection("materials")
      .where("profileId", "==", profileId)
      .get();
    return snap.docs
      .map((doc) => doc.data() as Material)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getChunks(materialId: string): Promise<Chunk[]> {
    const snap = await getDb()
      .collection("materials")
      .doc(materialId)
      .collection("chunks")
      .get();
    return snap.docs
      .map((doc) => doc.data() as Chunk)
      .sort((a, b) => a.order - b.order);
  }

  async createQuiz(data: Omit<Quiz, "id">): Promise<Quiz> {
    const id = crypto.randomUUID();
    const quiz: Quiz = { ...data, id };
    await getDb().collection("quizzes").doc(id).set(quiz);
    return quiz;
  }

  async getQuiz(id: string): Promise<Quiz | null> {
    const snap = await getDb().collection("quizzes").doc(id).get();
    return snap.exists ? (snap.data() as Quiz) : null;
  }

  async createAttempt(data: Omit<Attempt, "id">): Promise<Attempt> {
    const id = crypto.randomUUID();
    const attempt: Attempt = { ...data, id };
    await getDb().collection("attempts").doc(id).set(attempt);
    return attempt;
  }

  async getAttempt(id: string): Promise<Attempt | null> {
    const snap = await getDb().collection("attempts").doc(id).get();
    return snap.exists ? (snap.data() as Attempt) : null;
  }

  async listAttempts(profileId: string, materialId?: string): Promise<Attempt[]> {
    let query: Query<DocumentData> = getDb()
      .collection("attempts")
      .where("profileId", "==", profileId);
    if (materialId !== undefined) {
      query = query.where("materialId", "==", materialId);
    }
    const snap = await query.get();
    return snap.docs
      .map((doc) => doc.data() as Attempt)
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  }

  async getTopicProgress(profileId: string, topicId: string): Promise<TopicProgress | null> {
    const snap = await getDb()
      .collection("progress")
      .doc(profileId)
      .collection("topics")
      .doc(topicId)
      .get();
    return snap.exists ? (snap.data() as TopicProgress) : null;
  }

  async upsertTopicProgress(profileId: string, progress: TopicProgress): Promise<void> {
    await getDb()
      .collection("progress")
      .doc(profileId)
      .collection("topics")
      .doc(progress.topicId)
      .set(progress);
  }

  async listTopicProgress(profileId: string): Promise<TopicProgress[]> {
    const snap = await getDb().collection("progress").doc(profileId).collection("topics").get();
    return snap.docs.map((doc) => doc.data() as TopicProgress);
  }
}
