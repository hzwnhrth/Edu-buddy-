export type ReviewRating = "again" | "hard" | "good" | "easy";

export interface CardSchedule {
  cardId: string;
  dueAt: string;
  intervalDays: number;
  ease: number;
  repetitions: number;
  lapses: number;
  lastReviewedAt: string | null;
}

const DAY = 24 * 60 * 60 * 1000;

export function newCardSchedule(cardId: string, now = new Date()): CardSchedule {
  return { cardId, dueAt: now.toISOString(), intervalDays: 0, ease: 2.5, repetitions: 0, lapses: 0, lastReviewedAt: null };
}

// A compact SM-2-inspired scheduler. It keeps the important Anki behaviour
// (Again relearns, Good grows normally, Easy grows faster) without requiring a
// server-side account for a bundled practice deck.
export function scheduleReview(card: CardSchedule, rating: ReviewRating, now = new Date()): CardSchedule {
  const next = { ...card, lastReviewedAt: now.toISOString() };
  if (rating === "again") {
    next.intervalDays = 0;
    next.ease = Math.max(1.3, card.ease - 0.2);
    next.repetitions = 0;
    next.lapses += 1;
    next.dueAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
    return next;
  }

  next.ease = Math.max(1.3, card.ease + (rating === "easy" ? 0.15 : rating === "hard" ? -0.15 : 0));

  if (card.repetitions === 0) {
    // Learning step, mirroring Anki's new-card graduating intervals: one day
    // for hard/good, four days for easy.
    next.intervalDays = rating === "easy" ? 4 : 1;
  } else {
    const multiplier = rating === "hard" ? 1.2 : rating === "easy" ? next.ease * 1.3 : next.ease;
    next.intervalDays = Math.max(1, Math.round((card.intervalDays || 1) * multiplier));
  }
  next.repetitions += 1;
  next.dueAt = new Date(now.getTime() + next.intervalDays * DAY).toISOString();
  return next;
}

export function isDue(card: CardSchedule, now = new Date()): boolean {
  return new Date(card.dueAt).getTime() <= now.getTime();
}

export function dueCardIds(schedules: CardSchedule[], now = new Date()): string[] {
  return schedules.filter((card) => isDue(card, now)).map((card) => card.cardId);
}
