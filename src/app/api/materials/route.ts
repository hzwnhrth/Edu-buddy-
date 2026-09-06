import { jsonOk, withProfile } from "@/lib/api";

// Students read only teacher-published material; teachers can still access
// their private drafts through /api/me and the material detail endpoint.
export const GET = withProfile(async ({ identity, store }) => {
  if (identity.role !== "student") return jsonOk({ materials: [] });
  return jsonOk({ materials: await store.listPublishedMaterials() });
});
