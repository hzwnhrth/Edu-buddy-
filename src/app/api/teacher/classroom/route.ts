import { jsonOk, withProfile } from "@/lib/api";

// GET /api/teacher/classroom: the class roster for the Teacher Dashboard's
// Classroom View. One entry per profile (student) with real mastery data:
// overall mastery averaged over attempted topics, weak topics, quiz count,
// average score, last activity, and a red/yellow/green status derived the
// same way the Cinema concept intended. Read-only aggregation.

interface ClassroomStudent {
  id: string;
  name: string;
  mastery: number | null;
  status: "red" | "yellow" | "green";
  quizzesTaken: number;
  weakTopics: string[];
  lastActiveAt: string | null;
}

interface WeaknessRow {
  studentId: string;
  name: string;
  topic: string;
  score: string;
  lastActive: string;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - Date.parse(iso);
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const GET = withProfile(async ({ store }) => {
  const profileIds = await store.listProfileIds();

  const students: ClassroomStudent[] = [];
  const weaknessRows: WeaknessRow[] = [];
  let scoreSum = 0;
  let attemptTotal = 0;

  for (const profileId of profileIds) {
    const profile = await store.getOrCreateProfile(profileId);
    const progress = await store.listTopicProgress(profileId);
    const attempts = await store.listAttempts(profileId);

    attemptTotal += attempts.length;
    for (const attempt of attempts) {
      scoreSum += attempt.score;
    }

    const answered = progress.filter((topic) => topic.attempts > 0);
    const mastery =
      answered.length > 0
        ? Math.round((answered.reduce((sum, topic) => sum + topic.mastery, 0) / answered.length) * 100)
        : null;

    const weakTopics = progress.filter((topic) => topic.weak).map((topic) => topic.name);
    const hasWeak = weakTopics.length > 0;
    const status: ClassroomStudent["status"] = hasWeak ? "red" : mastery !== null && mastery < 75 ? "yellow" : "green";

    const lastActiveAt = attempts.length > 0
      ? attempts.reduce((latest, attempt) => (attempt.completedAt > latest ? attempt.completedAt : latest), attempts[0].completedAt)
      : null;

    const name = profile.displayName ?? `Student ${profileId.slice(0, 4)}`;

    students.push({
      id: profileId,
      name,
      mastery,
      status,
      quizzesTaken: attempts.length,
      weakTopics,
      lastActiveAt,
    });

    // One weakness-table row per weak topic, weakest-first per student.
    for (const topic of progress.filter((entry) => entry.weak).sort((a, b) => a.mastery - b.mastery)) {
      weaknessRows.push({
        studentId: profileId,
        name,
        topic: topic.name,
        score: `${Math.round(topic.mastery * 100)}%`,
        lastActive: topic.lastAttemptAt ? relativeTime(topic.lastAttemptAt) : "never",
      });
    }
  }

  weaknessRows.sort((a, b) => a.studentId.localeCompare(b.studentId));

  return jsonOk({
    stats: {
      totalStudents: students.length,
      needAttention: students.filter((student) => student.status === "red").length,
      classAvgScore: attemptTotal > 0 ? Math.round((scoreSum / attemptTotal) * 100) : null,
    },
    students,
    weaknessRows: weaknessRows.slice(0, 10),
    source: "live",
  });
});
