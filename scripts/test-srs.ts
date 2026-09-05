import { TEKS_SEJARAH_T4_BANK } from "@/content/teks-sejarah-t4-bank";
import { isDue, newCardSchedule, scheduleReview, type CardSchedule } from "@/lib/spaced-repetition";

// Exercises the T4 question bank and the spaced-repetition scheduler the way
// scripts/test-quiz.ts exercises the quiz routes: pure logic, no server, no
// secrets. Exits 1 if any case fails.

let failureCount = 0;

function ok(label: string): void {
  console.log(`OK: ${label}`);
}

function fail(label: string, detail?: unknown): void {
  failureCount += 1;
  console.error(`FAIL: ${label}${detail !== undefined ? ` -- ${String(detail)}` : ""}`);
}

function check(condition: boolean, label: string, detail?: unknown): void {
  if (condition) {
    ok(label);
  } else {
    fail(label, detail);
  }
}

const DAY = 24 * 60 * 60 * 1000;

async function main(): Promise<void> {
  // (a) bank integrity: 5 questions, unique ids and stems, 4 distinct options,
  // a valid answer index and a non-empty explanation each.
  check(TEKS_SEJARAH_T4_BANK.length === 5, "(a) bank has 5 questions", TEKS_SEJARAH_T4_BANK.length);
  const qids = new Set(TEKS_SEJARAH_T4_BANK.map((question) => question.qid));
  check(qids.size === TEKS_SEJARAH_T4_BANK.length, "(a) question ids are unique");
  check(
    TEKS_SEJARAH_T4_BANK.every(
      (question) =>
        question.options.length === 4 &&
        new Set(question.options).size === 4 &&
        question.correctAnswerIndex >= 0 &&
        question.correctAnswerIndex <= 3 &&
        question.explanation.trim().length > 0
    ),
    "(a) every question has 4 distinct options, a valid answer index and an explanation"
  );

  // (b) a new card is due immediately.
  const fresh = newCardSchedule("q1");
  check(isDue(fresh), "(b) a new card is due immediately");
  check(fresh.ease === 2.5 && fresh.repetitions === 0 && fresh.lapses === 0, "(b) a new card starts at ease 2.5, 0 repetitions, 0 lapses");

  // (c) first good review graduates at 1 day, like Anki's learning step.
  const firstGood = scheduleReview(fresh, "good", new Date("2026-01-01T09:00:00Z"));
  check(firstGood.intervalDays === 1, "(c) first good review has a 1-day interval", firstGood.intervalDays);
  check(firstGood.repetitions === 1, "(c) first good review counts one repetition");
  check(
    Math.abs(new Date(firstGood.dueAt).getTime() - (Date.parse("2026-01-01T09:00:00Z") + DAY)) < 1000,
    "(c) first good review is due one day later"
  );

  // (d) first easy review graduates at 4 days.
  const firstEasy = scheduleReview(fresh, "easy");
  check(firstEasy.intervalDays === 4, "(d) first easy review has a 4-day interval", firstEasy.intervalDays);
  check(firstEasy.ease > fresh.ease, "(d) easy review raises the ease factor");

  // (e) intervals grow multiplicatively after the learning step.
  let card: CardSchedule = firstGood;
  const growth: number[] = [];
  for (let i = 0; i < 4; i += 1) {
    card = scheduleReview(card, "good");
    growth.push(card.intervalDays);
  }
  check(
    growth.every((interval, i) => i === 0 || interval > growth[i - 1]),
    "(e) good reviews grow the interval every time",
    growth
  );

  // (f) hard grows slower than good from the same state.
  const beforeHard: CardSchedule = { ...card, intervalDays: 10, repetitions: 3 };
  const hardNext = scheduleReview(beforeHard, "hard");
  const goodNext = scheduleReview(beforeHard, "good");
  check(
    hardNext.intervalDays < goodNext.intervalDays,
    "(f) hard grows slower than good from the same state",
    `${hardNext.intervalDays} vs ${goodNext.intervalDays}`
  );

  // (g) again resets the card: relearning in 10 minutes, lapse counted, ease drops.
  const lapsed = scheduleReview(card, "again", new Date("2026-01-01T09:00:00Z"));
  check(lapsed.repetitions === 0, "(g) again resets repetitions to 0");
  check(lapsed.lapses === card.lapses + 1, "(g) again counts a lapse");
  check(lapsed.ease < card.ease, "(g) again lowers the ease factor");
  check(
    Math.abs(new Date(lapsed.dueAt).getTime() - (Date.parse("2026-01-01T09:00:00Z") + 10 * 60 * 1000)) < 1000,
    "(g) again is due for relearning in 10 minutes"
  );
  check(isDue(lapsed, new Date("2026-01-01T09:11:00Z")), "(g) the lapsed card is due again 11 minutes later");

  // (h) the ease factor never drops below 1.3.
  let drained = newCardSchedule("q2");
  for (let i = 0; i < 10; i += 1) {
    drained = scheduleReview(drained, "again");
  }
  check(drained.ease >= 1.3, "(h) ease bottoms out at 1.3 after repeated lapses", drained.ease);

  // (i) a freshly reviewed card is not due.
  check(!isDue(firstGood, new Date("2026-01-01T09:00:00Z")), "(i) a card scheduled for tomorrow is not due now");

  console.log("");
  if (failureCount > 0) {
    console.error(`${failureCount} check(s) failed`);
    process.exit(1);
  }
  console.log("All spaced-repetition and bank checks passed");
}

void main();
