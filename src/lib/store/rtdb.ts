import crypto from "node:crypto";
import { getRtdb } from "@/lib/store/chat";
import type {
  Attempt,
  AttemptAnswer,
  Chunk,
  Material,
  Profile,
  Question,
  Quiz,
  Topic,
  TopicProgress,
} from "@/lib/types";
import type { Store } from "@/lib/store/types";

// Firebase Realtime Database implementation of Store, used when BOTH the
// service account and FIREBASE_DATABASE_URL are configured (the same
// combination chat history already requires). Mirrors the behaviour of the
// former FirestoreStore: crypto.randomUUID ids, ISO date strings everywhere,
// the ten-minute lastSeenAt write throttle, listMaterials and listAttempts
// newest first, and getChunks ordered by chunk order.
//
// RTDB typings relied on below, read from the installed packages (never from
// memory):
// - node_modules/@firebase/database-types/index.d.ts (1.0.22):
//   Database.ref(path?: string | Reference): Reference;
//   Query.get(): Promise<DataSnapshot>;
//   DataSnapshot.exists(): boolean; DataSnapshot.val(): any.
// - Reference.set(value) resolves once the server has accepted the write
//   (Reference.set(value: any, onComplete?): Promise<void>, same file).
//
// Plain get() offers no server-side ordering or filtering, so every list
// method fetches its subtree once and sorts or filters in code, and every
// lookup by bare id (getMaterial, getQuiz, getAttempt) walks the collection's
// val() object for the owning parent key.

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

// A profile seen more recently than this does not get lastSeenAt rewritten,
// so a busy session does not write on every request.
const LAST_SEEN_THROTTLE_MS = 600_000;

// ---- paths -----------------------------------------------------------------
//
// Data layout: profiles/{profileId}, materials/{profileId}/{materialId},
// chunks/{materialId}/{chunkId} (chunkId is the chunk order), quizzes/
// {materialId}/{quizId}, attempts/{profileId}/{attemptId} and topicProgress/
// {profileId}/{topicId}. Chunks, quizzes and topic progress hang off the ids
// routes already know (materialId, topicId); materials and attempts hang off
// the owning profile, so lookups by bare id scan one collection.

function profilePath(profileId: string): string {
  return `profiles/${profileId}`;
}

function materialPath(profileId: string, materialId: string): string {
  return `materials/${profileId}/${materialId}`;
}

function chunksPath(materialId: string): string {
  return `chunks/${materialId}`;
}

function quizPath(materialId: string, quizId: string): string {
  return `quizzes/${materialId}/${quizId}`;
}

function attemptPath(profileId: string, attemptId: string): string {
  return `attempts/${profileId}/${attemptId}`;
}

function topicProgressPath(profileId: string, topicId: string): string {
  return `topicProgress/${profileId}/${topicId}`;
}

// ---- write and read helpers --------------------------------------------------

// The Realtime Database rejects writes containing undefined values (the write
// validation in node_modules/@firebase/database throws "contains undefined in
// property") and it deletes child keys whose value is null. A JSON round-trip
// drops undefined fields, such as a Material whose optional notes field is
// unset, while keeping explicit nulls, which is the value the caller meant to
// store; reads normalize the dropped nulls back (see below).
function toStorable<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

// Because a null child value is stored as an absent key, val() hands back
// objects where a field the shared types promise as string | null comes back
// as undefined instead. Code such as buildReviewQueue in src/lib/review.ts
// compares lastAttemptAt with === null, so every read restores these fields
// to null and defaults arrays that an empty write would have removed.

type StoredObject = Record<string, unknown>;

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function normalizeProfile(id: string, value: StoredObject): Profile {
  return {
    id,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : "",
    lastSeenAt: typeof value.lastSeenAt === "string" ? value.lastSeenAt : "",
    displayName: typeof value.displayName === "string" ? value.displayName : null,
    latestFeedback: nullableString(value.latestFeedback),
    latestFeedbackAt: nullableString(value.latestFeedbackAt),
    aiCallsToday: typeof value.aiCallsToday === "number" ? value.aiCallsToday : 0,
    aiCallsDate: typeof value.aiCallsDate === "string" ? value.aiCallsDate : "",
  };
}

function normalizeMaterial(materialId: string, value: StoredObject): Material {
  const stored = value as Omit<Material, "id">;
  return {
    ...stored,
    id: materialId,
    topics: asArray<Topic>(value.topics),
    notes: stored.notes ?? null,
  };
}

function normalizeTopicProgress(value: StoredObject): TopicProgress {
  return {
    topicId: typeof value.topicId === "string" ? value.topicId : "",
    materialId: typeof value.materialId === "string" ? value.materialId : "",
    name: typeof value.name === "string" ? value.name : "",
    attempts: typeof value.attempts === "number" ? value.attempts : 0,
    correct: typeof value.correct === "number" ? value.correct : 0,
    wrong: typeof value.wrong === "number" ? value.wrong : 0,
    mastery: typeof value.mastery === "number" ? value.mastery : 0,
    lastAttemptAt: nullableString(value.lastAttemptAt),
    weak: value.weak === true,
    explanation: nullableString(value.explanation),
    explanationAt: nullableString(value.explanationAt),
  };
}

// Reads one location and returns its value as a plain object, or null when
// nothing is stored there (DataSnapshot.exists() plus val(), per the typings
// quoted at the top).
async function readObject(path: string): Promise<StoredObject | null> {
  const snap = await getRtdb().ref(path).get();
  if (!snap.exists()) {
    return null;
  }
  return (snap.val() ?? {}) as StoredObject;
}

// The Store interface looks up materials, quizzes and attempts by bare id,
// but those live under their owning profile or material. One get() at the
// collection root returns the whole two-level subtree in a single read, and
// this walks the plain val() object for the parent whose child carries the
// id. Children stored as null are absent from val(), so no extra filtering
// is needed.
function findChildByRelatives(
  collection: StoredObject,
  id: string
): { parentId: string; value: StoredObject } | null {
  for (const [parentId, children] of Object.entries(collection)) {
    const child = (children as StoredObject | null)?.[id];
    if (child) {
      return { parentId, value: child as StoredObject };
    }
  }
  return null;
}

async function findMaterialById(
  id: string
): Promise<{ parentId: string; value: StoredObject } | null> {
  const collection = await readObject("materials");
  return collection ? findChildByRelatives(collection, id) : null;
}

async function findQuizById(
  id: string
): Promise<{ parentId: string; value: StoredObject } | null> {
  const collection = await readObject("quizzes");
  return collection ? findChildByRelatives(collection, id) : null;
}

async function findAttemptById(
  id: string
): Promise<{ parentId: string; value: StoredObject } | null> {
  const collection = await readObject("attempts");
  return collection ? findChildByRelatives(collection, id) : null;
}

// ---- the Store implementation -----------------------------------------------

export class RtdbStore implements Store {
  async getOrCreateProfile(id: string): Promise<Profile> {
    const ref = getRtdb().ref(profilePath(id));
    const now = new Date().toISOString();
    const stored = await readObject(profilePath(id));
    if (stored) {
      const profile = normalizeProfile(id, stored);
      const stale =
        !profile.lastSeenAt || Date.now() - Date.parse(profile.lastSeenAt) > LAST_SEEN_THROTTLE_MS;
      if (!stale) {
        return profile;
      }
      const updated = { ...profile, lastSeenAt: now };
      await ref.set(toStorable(updated));
      return updated;
    }
    const profile: Profile = {
      id,
      createdAt: now,
      lastSeenAt: now,
      displayName: null,
      latestFeedback: null,
      latestFeedbackAt: null,
      aiCallsToday: 0,
      aiCallsDate: todayUtc(),
    };
    await ref.set(toStorable(profile));
    return profile;
  }

  async updateProfile(id: string, patch: Partial<Omit<Profile, "id">>): Promise<void> {
    const ref = getRtdb().ref(profilePath(id));
    const stored = await readObject(profilePath(id));
    if (!stored) {
      throw new Error(`Profile not found: ${id}`);
    }
    await ref.set(toStorable({ ...normalizeProfile(id, stored), ...patch }));
  }

  async createMaterial(data: Omit<Material, "id">, chunks: Chunk[]): Promise<Material> {
    const id = crypto.randomUUID();
    const material: Material = { ...data, id };
    const chunksById: Record<string, Chunk> = {};
    for (const chunk of chunks) {
      chunksById[String(chunk.order)] = chunk;
    }
    // Two plain set() calls, material first: the former FirestoreStore used a
    // batch for this, but multi-path update semantics are not spelled out in
    // the installed typings, so this sticks to single-location writes.
    await getRtdb().ref(materialPath(data.profileId, id)).set(toStorable(material));
    await getRtdb().ref(chunksPath(id)).set(toStorable(chunksById));
    return material;
  }

  async getMaterial(id: string): Promise<Material | null> {
    const found = await findMaterialById(id);
    return found ? normalizeMaterial(id, found.value) : null;
  }

  async updateMaterial(
    id: string,
    patch: Partial<Omit<Material, "id" | "profileId">>
  ): Promise<void> {
    const found = await findMaterialById(id);
    if (!found) {
      throw new Error(`Material not found: ${id}`);
    }
    const material = { ...normalizeMaterial(id, found.value), ...patch };
    await getRtdb().ref(materialPath(found.parentId, id)).set(toStorable(material));
  }

  async listMaterials(profileId: string): Promise<Material[]> {
    const byMaterial = await readObject(`materials/${profileId}`);
    const materials = Object.entries(byMaterial ?? {}).map(([materialId, value]) =>
      normalizeMaterial(materialId, (value ?? {}) as StoredObject)
    );
    return materials.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getChunks(materialId: string): Promise<Chunk[]> {
    const byOrder = await readObject(chunksPath(materialId));
    return Object.values(byOrder ?? {})
      .map((value) => value as Chunk)
      .sort((a, b) => a.order - b.order);
  }

  async createQuiz(data: Omit<Quiz, "id">): Promise<Quiz> {
    const id = crypto.randomUUID();
    const quiz: Quiz = { ...data, id };
    await getRtdb().ref(quizPath(data.materialId, id)).set(toStorable(quiz));
    return quiz;
  }

  async getQuiz(id: string): Promise<Quiz | null> {
    const found = await findQuizById(id);
    if (!found) {
      return null;
    }
    const stored = found.value as Omit<Quiz, "id">;
    return { ...stored, id, questions: asArray<Question>(stored.questions) };
  }

  async createAttempt(data: Omit<Attempt, "id">): Promise<Attempt> {
    const id = crypto.randomUUID();
    const attempt: Attempt = { ...data, id };
    await getRtdb().ref(attemptPath(data.profileId, id)).set(toStorable(attempt));
    return attempt;
  }

  async getAttempt(id: string): Promise<Attempt | null> {
    const found = await findAttemptById(id);
    if (!found) {
      return null;
    }
    const stored = found.value as Omit<Attempt, "id">;
    return { ...stored, id, answers: asArray<AttemptAnswer>(stored.answers) };
  }

  async listAttempts(profileId: string, materialId?: string): Promise<Attempt[]> {
    const byAttempt = await readObject(`attempts/${profileId}`);
    const attempts = Object.entries(byAttempt ?? {})
      .map(([attemptId, value]) => {
        const stored = (value ?? {}) as Omit<Attempt, "id">;
        return { ...stored, id: attemptId, answers: asArray<AttemptAnswer>(stored.answers) };
      })
      .filter((attempt) => materialId === undefined || attempt.materialId === materialId);
    return attempts.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  }

  async getTopicProgress(profileId: string, topicId: string): Promise<TopicProgress | null> {
    const stored = await readObject(topicProgressPath(profileId, topicId));
    return stored ? normalizeTopicProgress(stored) : null;
  }

  async upsertTopicProgress(profileId: string, progress: TopicProgress): Promise<void> {
    await getRtdb()
      .ref(topicProgressPath(profileId, progress.topicId))
      .set(toStorable(progress));
  }

  async listTopicProgress(profileId: string): Promise<TopicProgress[]> {
    const byTopic = await readObject(`topicProgress/${profileId}`);
    return Object.values(byTopic ?? {}).map((value) =>
      normalizeTopicProgress((value ?? {}) as StoredObject)
    );
  }

  async listProfileIds(): Promise<string[]> {
    const profiles = await readObject("profiles");
    return Object.keys(profiles ?? {});
  }
}
