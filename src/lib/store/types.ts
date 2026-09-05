import type {
  Attempt,
  Chunk,
  Material,
  Profile,
  Quiz,
  TopicProgress,
} from "@/lib/types";

// The persistence contract the rest of the app codes against. MemoryStore and
// RtdbStore both implement this so routes and AI logic never branch on
// which backend is active.
export interface Store {
  getOrCreateProfile(id: string): Promise<Profile>;
  updateProfile(id: string, patch: Partial<Omit<Profile, "id">>): Promise<void>;

  createMaterial(data: Omit<Material, "id">, chunks: Chunk[]): Promise<Material>;
  getMaterial(id: string): Promise<Material | null>;
  updateMaterial(
    id: string,
    patch: Partial<Omit<Material, "id" | "profileId">>
  ): Promise<void>;
  listMaterials(profileId: string): Promise<Material[]>;
  getChunks(materialId: string): Promise<Chunk[]>;

  createQuiz(data: Omit<Quiz, "id">): Promise<Quiz>;
  getQuiz(id: string): Promise<Quiz | null>;

  createAttempt(data: Omit<Attempt, "id">): Promise<Attempt>;
  getAttempt(id: string): Promise<Attempt | null>;
  listAttempts(profileId: string, materialId?: string): Promise<Attempt[]>;

  getTopicProgress(profileId: string, topicId: string): Promise<TopicProgress | null>;
  upsertTopicProgress(profileId: string, progress: TopicProgress): Promise<void>;
  listTopicProgress(profileId: string): Promise<TopicProgress[]>;

  // Every profile id that exists, for the admin overview's school-wide
  // aggregation. No per-profile ownership check applies to this listing.
  listProfileIds(): Promise<string[]>;
}
