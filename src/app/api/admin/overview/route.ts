import { jsonOk, withRole } from "@/lib/api";

// GET /api/admin/overview: school-wide analytics for the Admin Dashboard.
// Aggregates real data across every profile in the store: student count,
// materials, attempts, average score, and resource alerts derived from
// topics flagged weak for multiple students. Read-only.

interface AdminAlert {
  id: string;
  priority: "High" | "Medium" | "Low";
  subject: string;
  teacher: string;
  issue: string;
  recommendation: string;
  remedial: { day: string; time: string; room: string };
  licenses: number;
  studentsAffected: number;
}

export const GET = withRole("admin", async ({ store }) => {
  const profileIds = await store.listProfileIds();

  let attemptCount = 0;
  let scoreSum = 0;
  let materialCount = 0;
  const subjectTitles = new Set<string>();

  // Weak-topic aggregation: topic name -> { students, masterySum }
  const weakByName = new Map<string, { students: number; masterySum: number; materialIds: Set<string> }>();

  for (const profileId of profileIds) {
    const attempts = await store.listAttempts(profileId);
    attemptCount += attempts.length;
    for (const attempt of attempts) {
      scoreSum += attempt.score;
    }

    const materials = await store.listMaterials(profileId);
    materialCount += materials.length;
    for (const material of materials) {
      subjectTitles.add(material.title);
    }

    const progress = await store.listTopicProgress(profileId);
    for (const topic of progress) {
      if (!topic.weak) continue;
      const entry = weakByName.get(topic.name) ?? { students: 0, masterySum: 0, materialIds: new Set<string>() };
      entry.students += 1;
      entry.masterySum += topic.mastery;
      entry.materialIds.add(topic.materialId);
      weakByName.set(topic.name, entry);
    }
  }

  // Turn the weakest, most-shared topics into up to 3 actionable alerts.
  const alerts: AdminAlert[] = [...weakByName.entries()]
    .sort((a, b) => b[1].students - a[1].students || a[1].masterySum - b[1].masterySum)
    .slice(0, 3)
    .map(([name, entry], index) => {
      const avgMastery = Math.round((entry.masterySum / entry.students) * 100);
      const priority: AdminAlert["priority"] =
        entry.students >= 3 ? "High" : entry.students === 2 ? "Medium" : "Low";
      return {
        id: `weak-${index + 1}`,
        priority,
        subject: name,
        teacher: "Class Teacher",
        issue: `${entry.students} student${entry.students > 1 ? "s" : ""} struggling with ${name} (avg mastery ${avgMastery}%)`,
        recommendation:
          entry.students >= 3
            ? `Several students are weak on ${name}. Notify the teacher and consider extra AI Tutor capacity.`
            : `A student needs support on ${name}. A remedial session or extra practice quiz will help.`,
        remedial: { day: "Saturday", time: "10:00 AM", room: "To be scheduled" },
        licenses: entry.students >= 3 ? 2 : 1,
        studentsAffected: entry.students,
      };
    });

  return jsonOk({
    stats: {
      activeClasses: Math.max(subjectTitles.size, materialCount > 0 ? 1 : 0),
      totalStudents: profileIds.length,
      materialsCreated: materialCount,
      quizzesTaken: attemptCount,
      schoolAvgScore: attemptCount > 0 ? Math.round((scoreSum / attemptCount) * 100) : null,
      weakTopics: weakByName.size,
    },
    alerts,
    source: "live",
  });
});
