/**
 * ReviewRating
 * How well one review went.
 * @typedef {'again'|'hard'|'good'|'easy'} ReviewRating
 */

/**
 * CardSchedule
 * Persisted scheduler state for one question, keyed by its qid.
 * @typedef {Object} CardSchedule
 * @property {string} cardId The question id this schedule belongs to.
 * @property {string} dueAt ISO timestamp of the next due moment.
 * @property {number} intervalDays Current review interval in days.
 * @property {number} ease SM-2 style ease factor.
 * @property {number} repetitions Successful reviews in a row.
 * @property {number} lapses How often the card was forgotten.
 * @property {string|null} lastReviewedAt ISO timestamp of the last review, or null.
 */

const DAY = 24 * 60 * 60 * 1000;

/**
 * newCardSchedule
 * The schedule of a card that has never been reviewed: due immediately.
 */
export function newCardSchedule(cardId, now = new Date()) {
  return { cardId, dueAt: now.toISOString(), intervalDays: 0, ease: 2.5, repetitions: 0, lapses: 0, lastReviewedAt: null };
}

// A compact SM-2-inspired scheduler. It keeps the important Anki behaviour
// (Again relearns, Good grows normally, Easy grows faster) without requiring a
// server-side account for a bundled practice deck.

/**
 * scheduleReview
 * Applies one review to a card and returns its next schedule.
 */
export function scheduleReview(card, rating, now = new Date()) {
  const next = { ...card, lastReviewedAt: now.toISOString() };
  if (rating === 'again') {
    next.intervalDays = 0;
    next.ease = Math.max(1.3, card.ease - 0.2);
    next.repetitions = 0;
    next.lapses += 1;
    next.dueAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
    return next;
  }

  next.ease = Math.max(1.3, card.ease + (rating === 'easy' ? 0.15 : rating === 'hard' ? -0.15 : 0));

  if (card.repetitions === 0) {
    // Learning step, mirroring Anki's new-card graduating intervals: one day
    // for hard/good, four days for easy.
    next.intervalDays = rating === 'easy' ? 4 : 1;
  } else {
    const multiplier = rating === 'hard' ? 1.2 : rating === 'easy' ? next.ease * 1.3 : next.ease;
    next.intervalDays = Math.max(1, Math.round((card.intervalDays || 1) * multiplier));
  }
  next.repetitions += 1;
  next.dueAt = new Date(now.getTime() + next.intervalDays * DAY).toISOString();
  return next;
}

/**
 * isDue
 * True when the card's due moment has arrived.
 */
export function isDue(card, now = new Date()) {
  return new Date(card.dueAt).getTime() <= now.getTime();
}

/**
 * dueCardIds
 * The ids of every card in the list that is due at the given moment.
 */
export function dueCardIds(schedules, now = new Date()) {
  return schedules.filter((card) => isDue(card, now)).map((card) => card.cardId);
}
