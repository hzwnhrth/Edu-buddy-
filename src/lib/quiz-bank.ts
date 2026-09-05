import { QUIZ_BANKS, type QuizBank, type BankQuestion } from "@/content/quiz-banks";
import { newCardSchedule, type CardSchedule } from "@/lib/spaced-repetition";
import type { PublicQuestion } from "@/lib/types";

// Client-side helpers around the bundled quiz banks: per-bank schedule
// storage in localStorage, Fisher-Yates shuffling, and building one practice
// session (from one chapter or a mix of all of them) out of the scheduler's
// state. Storage never throws; practice works for the session even when
// persistence is unavailable.

// Per-bank schedule pools for one session, keyed by bank id.
export type SchedulesByBank = Record<string, CardSchedule[]>;

export function srsStorageKey(bankId: string): string {
  return `edubuddy.srs.${bankId}`;
}

// The bank a question id belongs to, for routing an answer to the right
// schedule pool; null for an unknown id.
const bankByQid = new Map<string, QuizBank>(QUIZ_BANKS.flatMap((bank) => bank.questions.map((question) => [question.qid, bank])));
export function bankForQid(qid: string): QuizBank | null {
  return bankByQid.get(qid) ?? null;
}

// Fisher-Yates shuffle returning a copy; the input is never mutated.
export function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// One bank's schedules from storage, with a fresh card for any question the
// storage has never seen, so new bank questions join seamlessly while old
// question ids keep their schedule forever.
export function schedulesForBank(bank: QuizBank): CardSchedule[] {
  let saved: CardSchedule[] = [];
  try {
    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem(srsStorageKey(bank.id));
      saved = raw ? (JSON.parse(raw) as CardSchedule[]) : [];
    }
  } catch {
    saved = [];
  }
  const known = new Map(saved.map((card) => [card.cardId, card]));
  return bank.questions.map((question) => known.get(question.qid) ?? newCardSchedule(question.qid));
}

// Loads every given bank's schedule pool at once.
export function loadSchedules(banks: readonly QuizBank[]): SchedulesByBank {
  const pools: SchedulesByBank = {};
  for (const bank of banks) {
    pools[bank.id] = schedulesForBank(bank);
  }
  return pools;
}

export function saveSchedules(bankId: string, schedules: CardSchedule[]): void {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(srsStorageKey(bankId), JSON.stringify(schedules));
    }
  } catch {
    // The session still works; only persistence is lost.
  }
}

export function deckDueCount(bank: QuizBank, now = new Date()): number {
  return schedulesForBank(bank).filter((card) => new Date(card.dueAt).getTime() <= now.getTime()).length;
}

// One bank question with its options shuffled and the answer index remapped,
// so no round ever shows the same recognisable pattern. Options are unique
// within a question (checked by scripts/test-srs.ts), so the remap is exact.
function toScrambledQuestion(question: BankQuestion, topicId: string): PublicQuestion {
  const order = shuffle([0, 1, 2, 3]);
  return {
    qid: question.qid,
    topicId,
    stem: question.stem,
    options: order.map((index) => question.options[index]) as [string, string, string, string],
    correctAnswerIndex: order.indexOf(question.answerIndex) as 0 | 1 | 2 | 3,
    explanation: question.explanation,
  };
}

// Ordered session selection across every given bank's pool before any final
// shuffle: cards the scheduler says are due first (across all banks), then,
// only to fill the requested count, the rest by soonest due date (practising
// ahead). Capped at `count`.
export function selectSessionQuestions(
  banks: readonly QuizBank[],
  pools: SchedulesByBank,
  count: number,
  now = new Date()
): PublicQuestion[] {
  interface Entry {
    question: BankQuestion;
    bank: QuizBank;
    dueAt: number;
  }

  const due: Entry[] = [];
  const rest: Entry[] = [];
  for (const bank of banks) {
    const questionByQid = new Map(bank.questions.map((question) => [question.qid, question]));
    for (const card of pools[bank.id] ?? []) {
      const question = questionByQid.get(card.cardId);
      if (!question) continue;
      const entry: Entry = { question, bank, dueAt: new Date(card.dueAt).getTime() };
      if (entry.dueAt <= now.getTime()) {
        due.push(entry);
      } else {
        rest.push(entry);
      }
    }
  }

  return [...shuffle(due), ...rest.sort((a, b) => a.dueAt - b.dueAt)]
    .slice(0, Math.max(0, count))
    .map(({ question, bank }) => toScrambledQuestion(question, bank.topicId));
}

// The full session: the selected cards in random order (Anki shows due cards
// shuffled, and the due-first split is a selection priority, not a sequence).
export function buildSessionQuestions(
  banks: readonly QuizBank[],
  pools: SchedulesByBank,
  count: number,
  now = new Date()
): PublicQuestion[] {
  return shuffle(selectSessionQuestions(banks, pools, count, now));
}

// Human label for the soonest due card, for the results view.
export function nextDueLabel(schedules: readonly CardSchedule[], now = new Date()): string {
  if (schedules.length === 0) return "later";
  const earliest = Math.min(...schedules.map((card) => new Date(card.dueAt).getTime()));
  const ms = earliest - now.getTime();
  if (ms <= 0) return "now";
  const minutes = Math.max(1, Math.round(ms / 60000));
  if (minutes < 60) return `in about ${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `in about ${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  return `in about ${days} day${days === 1 ? "" : "s"}`;
}
