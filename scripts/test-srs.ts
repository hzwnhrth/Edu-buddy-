import { DECK_OPTIONS, QUIZ_BANKS, type QuizBank } from "@/content/quiz-banks";
import { buildSessionQuestions, nextDueLabel, selectSessionQuestions, type SchedulesByBank } from "@/lib/quiz-bank";
import { isDue, newCardSchedule, scheduleReview, type CardSchedule } from "@/lib/spaced-repetition";

// Exercises the bundled quiz banks and the spaced-repetition layer (scheduler
// plus session builder) the way scripts/test-quiz.ts exercises the quiz
// routes: pure logic, no server, no secrets. Exits 1 if any case fails.

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

function canonical(values: readonly string[]): string {
  return JSON.stringify([...values].sort());
}

function freshPools(banks: readonly QuizBank[]): SchedulesByBank {
  const pools: SchedulesByBank = {};
  for (const bank of banks) {
    pools[bank.id] = bank.questions.map((question) => newCardSchedule(question.qid));
  }
  return pools;
}

async function main(): Promise<void> {
  // (a) bank integrity: three banks of 10 questions each, unique ids across
  // the whole registry, 4 distinct options, a valid answer index and a
  // non-empty explanation per question.
  check(QUIZ_BANKS.length === 3, "(a) registry has three chapter banks", QUIZ_BANKS.length);
  const allQids = new Set(QUIZ_BANKS.flatMap((bank) => bank.questions.map((question) => question.qid)));
  check(allQids.size === QUIZ_BANKS.length * 10, "(a) 30 question ids, all unique", allQids.size);
  check(
    QUIZ_BANKS.every(
      (bank) =>
        bank.questions.length === 10 &&
        bank.questions.every(
          (question) =>
            question.options.length === 4 &&
            new Set(question.options).size === 4 &&
            question.answerIndex >= 0 &&
            question.answerIndex <= 3 &&
            question.explanation.trim().length > 0
        )
    ),
    "(a) every bank has 10 questions, each with 4 distinct options, a valid answer index and an explanation"
  );
  check(
    DECK_OPTIONS.length === QUIZ_BANKS.length + 1 &&
      DECK_OPTIONS[DECK_OPTIONS.length - 1].banks.length === QUIZ_BANKS.length,
    "(a) deck options are the chapters plus one mix of all three"
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

  // (j) scrambling: over 25 rounds every session keeps every original
  // question and its exact correct answer text (options reshuffled, index
  // remapped), and at least one round differs from the bank's own order.
  // Run for one chapter and for the full mix.
  for (const label of ["single chapter", "mixed chapters"] as const) {
    const banks = label === "single chapter" ? [QUIZ_BANKS[0]] : QUIZ_BANKS;
    const pools = freshPools(banks);
    const expected = banks.flatMap((bank) => bank.questions);
    let scrambleVaries = false;
    let scramblesHold = true;
    for (let round = 0; round < 25; round += 1) {
      const session = buildSessionQuestions(banks, pools, 40);
      if (
        session[0].qid !== expected[0].qid ||
        session[0].options[0] !== expected[0].options[0]
      ) {
        scrambleVaries = true;
      }
      for (const original of expected) {
        const shown = session.find((entry) => entry.qid === original.qid);
        if (
          !shown ||
          canonical(shown.options) !== canonical(original.options) ||
          shown.options[shown.correctAnswerIndex] !== original.options[original.answerIndex]
        ) {
          scramblesHold = false;
        }
      }
    }
    check(scramblesHold, `(j) ${label}: every scrambled session keeps all questions and the correct answer at the marked index`);
    check(scrambleVaries, `(j) ${label}: scrambling varies question or option order across rounds`);
  }

  // (k) session selection: due cards come first across banks, the count caps
  // the session, and not-due cards only fill the remaining slots.
  const now = new Date("2026-01-01T09:00:00Z");
  const past = "2025-12-01T09:00:00Z";
  const future = new Date(now.getTime() + 5 * DAY).toISOString();
  const pools: SchedulesByBank = {};
  for (const bank of QUIZ_BANKS) {
    pools[bank.id] = bank.questions.map((question, i) => ({
      ...newCardSchedule(question.qid, now),
      repetitions: 1,
      dueAt: i < 3 ? past : future,
    }));
  }
  const dueIds = new Set(QUIZ_BANKS.flatMap((bank) => bank.questions.slice(0, 3).map((question) => question.qid)));
  const singleBank = QUIZ_BANKS[0];
  const selectedSingle = selectSessionQuestions([singleBank], pools, 10, now);
  check(selectedSingle.length === 10, "(k) a count of 10 selects every card of one bank", selectedSingle.length);
  check(
    new Set(selectedSingle.slice(0, 3).map((question) => question.qid)).size === 3 &&
      selectedSingle.slice(0, 3).every((question) => dueIds.has(question.qid)),
    "(k) one bank: the three due cards are selected first"
  );
  const selectedThree = selectSessionQuestions([singleBank], pools, 3, now);
  check(
    selectedThree.length === 3 && selectedThree.every((question) => dueIds.has(question.qid)),
    "(k) one bank: a count of 3 selects exactly the three due cards"
  );
  const selectedMixed = selectSessionQuestions(QUIZ_BANKS, pools, 40, now);
  check(selectedMixed.length === 30, "(k) the mix selects all 30 cards", selectedMixed.length);
  check(
    selectedMixed.slice(0, 9).every((question) => dueIds.has(question.qid)) &&
      new Set(selectedMixed.slice(0, 9).map((question) => question.qid)).size === 9,
    "(k) the mix puts the nine due cards (three per bank) first"
  );
  const selectedTen = selectSessionQuestions(QUIZ_BANKS, pools, 10, now);
  check(
    selectedTen.length === 10 &&
      selectedTen.slice(0, 9).every((question) => dueIds.has(question.qid)) &&
      !dueIds.has(selectedTen[9].qid),
    "(k) the mix with a count of 10 draws the nine due cards first, then fills the last slot ahead of schedule"
  );

  // (l) next-due labels.
  const labelNow = nextDueLabel([{ ...newCardSchedule("x"), dueAt: "2026-01-01T08:59:00Z" }], now);
  check(labelNow === "now", "(l) an overdue schedule reads 'now'", labelNow);
  const labelMinutes = nextDueLabel(
    [{ ...newCardSchedule("x"), dueAt: new Date(now.getTime() + 25 * 60 * 1000).toISOString() }],
    now
  );
  check(labelMinutes === "in about 25 minutes", "(l) 25 minutes out reads 'in about 25 minutes'", labelMinutes);
  const labelHours = nextDueLabel([{ ...newCardSchedule("x"), dueAt: new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString() }], now);
  check(labelHours === "in about 3 hours", "(l) 3 hours out reads 'in about 3 hours'", labelHours);
  const labelDays = nextDueLabel([{ ...newCardSchedule("x"), dueAt: new Date(now.getTime() + 2 * DAY).toISOString() }], now);
  check(labelDays === "in about 2 days", "(l) 2 days out reads 'in about 2 days'", labelDays);

  console.log("");
  if (failureCount > 0) {
    console.error(`${failureCount} check(s) failed`);
    process.exit(1);
  }
  console.log("All spaced-repetition, scramble and session checks passed");
}

void main();
