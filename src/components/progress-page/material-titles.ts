// Title lookups shared by the Progress screen parts. Attempts carry only
// topic ids, so the material title is reached through the topics each
// material owns.

import type { MeResponse } from "@/lib/api-types";

type MaterialEntry = MeResponse["materials"][number];

export interface TitleLookups {
  byTopicId: Map<string, string>;
  byMaterialId: Map<string, string>;
}

// Topic ids are unique within one material, so when an id would show up in
// two materials the first material in the list wins.
export function buildTitleLookups(materials: MaterialEntry[]): TitleLookups {
  const byTopicId = new Map<string, string>();
  const byMaterialId = new Map<string, string>();
  for (const material of materials) {
    if (!byMaterialId.has(material.id)) {
      byMaterialId.set(material.id, material.title);
    }
    for (const topic of material.topics) {
      if (!byTopicId.has(topic.id)) {
        byTopicId.set(topic.id, material.title);
      }
    }
  }
  return { byTopicId, byMaterialId };
}
