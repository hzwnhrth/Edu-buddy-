import crypto from "node:crypto";
import type {
  Attempt,
  Chunk,
  Material,
  Profile,
  Quiz,
  TopicProgress,
} from "@/lib/types";
import type { Store } from "@/lib/store/types";

// The raw tables behind MemoryStore. Kept on globalThis (see below) rather
// than as plain instance fields, so a fresh MemoryStore() after a Next.js dev
// hot reload reattaches to the same data instead of starting empty.
interface MemoryTables {
  profiles: Map<string, Profile>;
  materials: Map<string, Material>;
  chunksByMaterial: Map<string, Chunk[]>;
  quizzes: Map<string, Quiz>;
  attempts: Map<string, Attempt>;
  topicProgressByProfile: Map<string, Map<string, TopicProgress>>;
}

declare global {
  var __edubuddyMemoryStore: MemoryTables | undefined;
}

function getTables(): MemoryTables {
  if (!globalThis.__edubuddyMemoryStore) {
    globalThis.__edubuddyMemoryStore = {
      profiles: new Map(),
      materials: new Map(),
      chunksByMaterial: new Map(),
      quizzes: new Map(),
      attempts: new Map(),
      topicProgressByProfile: new Map(),
    };
  }
  return globalThis.__edubuddyMemoryStore;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

// A profile seen more recently than this does not get lastSeenAt rewritten,
// so a busy session does not write on every request.
const LAST_SEEN_THROTTLE_MS = 600_000;

// In-process implementation of Store, used whenever no Firebase service
// account is configured. Data lives only for the life of the Node process.
export class MemoryStore implements Store {
  private tables = getTables();

  async getOrCreateProfile(id: string): Promise<Profile> {
    const now = new Date().toISOString();
    const existing = this.tables.profiles.get(id);
    if (existing) {
      const stale =
        !existing.lastSeenAt || Date.now() - Date.parse(existing.lastSeenAt) > LAST_SEEN_THROTTLE_MS;
      if (stale) {
        existing.lastSeenAt = now;
      }
      return { ...existing };
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
    this.tables.profiles.set(id, profile);
    return { ...profile };
  }

  async updateProfile(id: string, patch: Partial<Omit<Profile, "id">>): Promise<void> {
    const existing = this.tables.profiles.get(id);
    if (!existing) {
      throw new Error(`Profile not found: ${id}`);
    }
    this.tables.profiles.set(id, { ...existing, ...patch });
  }

  async createMaterial(data: Omit<Material, "id">, chunks: Chunk[]): Promise<Material> {
    const material: Material = { ...data, id: crypto.randomUUID() };
    this.tables.materials.set(material.id, material);
    this.tables.chunksByMaterial.set(
      material.id,
      [...chunks].sort((a, b) => a.order - b.order)
    );
    return { ...material };
  }

  async getMaterial(id: string): Promise<Material | null> {
    const material = this.tables.materials.get(id);
    return material ? { ...material } : null;
  }

  async updateMaterial(
    id: string,
    patch: Partial<Omit<Material, "id" | "profileId">>
  ): Promise<void> {
    const existing = this.tables.materials.get(id);
    if (!existing) {
      throw new Error(`Material not found: ${id}`);
    }
    this.tables.materials.set(id, { ...existing, ...patch });
  }

  async listMaterials(profileId: string): Promise<Material[]> {
    return [...this.tables.materials.values()]
      .filter((material) => material.profileId === profileId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((material) => ({ ...material }));
  }

  async getChunks(materialId: string): Promise<Chunk[]> {
    const chunks = this.tables.chunksByMaterial.get(materialId) ?? [];
    return [...chunks].sort((a, b) => a.order - b.order);
  }

  async createQuiz(data: Omit<Quiz, "id">): Promise<Quiz> {
    const quiz: Quiz = { ...data, id: crypto.randomUUID() };
    this.tables.quizzes.set(quiz.id, quiz);
    return { ...quiz };
  }

  async getQuiz(id: string): Promise<Quiz | null> {
    const quiz = this.tables.quizzes.get(id);
    return quiz ? { ...quiz } : null;
  }

  async createAttempt(data: Omit<Attempt, "id">): Promise<Attempt> {
    const attempt: Attempt = { ...data, id: crypto.randomUUID() };
    this.tables.attempts.set(attempt.id, attempt);
    return { ...attempt };
  }

  async getAttempt(id: string): Promise<Attempt | null> {
    const attempt = this.tables.attempts.get(id);
    return attempt ? { ...attempt } : null;
  }

  async listAttempts(profileId: string, materialId?: string): Promise<Attempt[]> {
    return [...this.tables.attempts.values()]
      .filter(
        (attempt) =>
          attempt.profileId === profileId &&
          (materialId === undefined || attempt.materialId === materialId)
      )
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
      .map((attempt) => ({ ...attempt }));
  }

  async getTopicProgress(profileId: string, topicId: string): Promise<TopicProgress | null> {
    const progress = this.tables.topicProgressByProfile.get(profileId)?.get(topicId);
    return progress ? { ...progress } : null;
  }

  async upsertTopicProgress(profileId: string, progress: TopicProgress): Promise<void> {
    let byTopic = this.tables.topicProgressByProfile.get(profileId);
    if (!byTopic) {
      byTopic = new Map();
      this.tables.topicProgressByProfile.set(profileId, byTopic);
    }
    byTopic.set(progress.topicId, { ...progress });
  }

  async listTopicProgress(profileId: string): Promise<TopicProgress[]> {
    const byTopic = this.tables.topicProgressByProfile.get(profileId);
    return byTopic ? [...byTopic.values()].map((progress) => ({ ...progress })) : [];
  }

  async listProfileIds(): Promise<string[]> {
    return [...this.tables.profiles.keys()];
  }
}
