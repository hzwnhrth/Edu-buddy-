// Hand-written fixture data for the dev preview page and any local component
// checks. Typed against the shared contract types so a change to those types
// surfaces here as a compile error. Deliberately does not import from
// src/content: that module belongs to the AI layer and may not exist yet.

import type { Material, PublicQuestion, Topic, TopicProgress } from "@/lib/types";
import type {
  AttemptResponse,
  AttemptSummary,
  ExplainResponse,
  MeResponse,
  PublicQuiz,
  QuestionResult,
  TopicResult,
} from "@/lib/api-types";

const FIXTURE_PROFILE_ID = "fixture-profile-0000";

const photosynthesisTopics: Topic[] = [
  {
    id: "light-dependent-reactions",
    name: "Light dependent reactions",
    summary: "How chloroplasts turn sunlight into chemical energy carriers.",
    keyPoints: [
      "Happens in the thylakoid membrane.",
      "Splits water and releases oxygen as a by-product.",
      "Produces ATP and NADPH for the next stage.",
      "Chlorophyll absorbs red and blue light best.",
    ],
  },
  {
    id: "calvin-cycle",
    name: "The Calvin cycle",
    summary: "How captured energy is used to build sugar from carbon dioxide.",
    keyPoints: [
      "Takes place in the stroma, not the thylakoid membrane.",
      "Uses the ATP and NADPH made by the light dependent reactions.",
      "Fixes carbon dioxide with the enzyme rubisco.",
      "Needs several turns of the cycle to release one sugar molecule.",
    ],
  },
  {
    id: "chlorophyll-and-pigments",
    name: "Chlorophyll and pigments",
    summary: "Why leaves are green and how pigments capture light.",
    keyPoints: [
      "Chlorophyll a and b absorb mostly red and blue light.",
      "Green light is reflected, which is why leaves look green.",
      "Carotenoids capture extra wavelengths and protect the leaf.",
      "Pigments sit inside the thylakoid membrane.",
    ],
  },
  {
    id: "leaf-structure",
    name: "Leaf structure and stomata",
    summary: "How a leaf's shape helps it capture light and exchange gases.",
    keyPoints: [
      "The upper epidermis is transparent to let light through.",
      "Palisade cells are packed with chloroplasts.",
      "Stomata open and close to control gas exchange.",
      "Guard cells manage water loss and carbon dioxide intake.",
    ],
  },
  {
    id: "factors-affecting-photosynthesis",
    name: "Factors affecting the rate",
    summary: "What speeds up or limits how fast a plant photosynthesises.",
    keyPoints: [
      "Light intensity, carbon dioxide level and temperature all matter.",
      "The scarcest of these factors limits the rate, whatever the others are doing.",
      "Rate rises with light intensity until another factor takes over as the limit.",
      "Very high temperatures slow down enzymes such as rubisco.",
    ],
  },
];

const cellTopics: Topic[] = [
  {
    id: "cell-membrane",
    name: "The cell membrane",
    summary: "How the membrane controls what enters and leaves a cell.",
    keyPoints: [
      "Made of a phospholipid bilayer.",
      "Controls movement of substances in and out of the cell.",
      "Contains embedded proteins that act as channels and pumps.",
    ],
  },
  {
    id: "nucleus-and-dna",
    name: "The nucleus and DNA",
    summary: "Where genetic instructions are stored and read.",
    keyPoints: [
      "Holds the cell's DNA, organised into chromosomes.",
      "Surrounded by a double membrane called the nuclear envelope.",
      "The site where DNA is copied into RNA.",
    ],
  },
  {
    id: "mitochondria",
    name: "Mitochondria and energy",
    summary: "How cells release usable energy from food.",
    keyPoints: [
      "Often called the powerhouse of the cell.",
      "The main site of aerobic respiration.",
      "Carries its own small set of DNA.",
    ],
  },
];

export const fixtureMaterial: Material = {
  id: "fixture-material-photosynthesis",
  profileId: FIXTURE_PROFILE_ID,
  title: "Basic Photosynthesis",
  sourceName: "photosynthesis-notes.pdf",
  pageCount: 4,
  charCount: 6200,
  status: "ready",
  topics: photosynthesisTopics,
  createdAt: "2026-08-25T09:15:00.000Z",
};

export const fixtureMaterialSecondary: Material = {
  id: "fixture-material-cells",
  profileId: FIXTURE_PROFILE_ID,
  title: "Cell Structure Basics",
  sourceName: "pasted",
  pageCount: 0,
  charCount: 2100,
  status: "ready",
  topics: cellTopics,
  createdAt: "2026-08-30T18:40:00.000Z",
};

const quizQuestions: PublicQuestion[] = [
  {
    qid: "q1",
    topicId: "light-dependent-reactions",
    stem: "Where in the chloroplast do the light dependent reactions take place?",
    options: [
      "The thylakoid membrane",
      "The stroma",
      "The outer membrane",
      "The cell wall",
    ],
  },
  {
    qid: "q2",
    topicId: "calvin-cycle",
    stem: "What does the Calvin cycle use to build sugar?",
    options: [
      "ATP and NADPH from the light dependent reactions",
      "Oxygen released by the roots",
      "Chlorophyll molecules directly",
      "Water absorbed by the stomata",
    ],
  },
  {
    qid: "q3",
    topicId: "chlorophyll-and-pigments",
    stem: "Why do most leaves look green?",
    options: [
      "Chlorophyll reflects green light",
      "Chlorophyll absorbs green light",
      "Carotenoids block red light",
      "Stomata filter out green light",
    ],
  },
  {
    qid: "q4",
    topicId: "factors-affecting-photosynthesis",
    stem: "A plant has plenty of light but very little carbon dioxide. What will help most?",
    options: [
      "Increasing the carbon dioxide supply",
      "Increasing the light intensity further",
      "Removing chlorophyll from the leaves",
      "Closing the stomata completely",
    ],
  },
];

export const fixtureQuiz: PublicQuiz = {
  id: "fixture-quiz-1",
  materialId: fixtureMaterial.id,
  topicIds: quizQuestions.map((question) => question.topicId),
  difficulty: "medium",
  questions: quizQuestions,
  createdAt: "2026-09-01T10:00:00.000Z",
};

const questionResults: QuestionResult[] = [
  {
    qid: "q1",
    topicId: "light-dependent-reactions",
    stem: "Where in the chloroplast do the light dependent reactions take place?",
    options: [
      "The thylakoid membrane",
      "The stroma",
      "The outer membrane",
      "The cell wall",
    ],
    chosenIndex: 0,
    correct: true,
    answerIndex: 0,
    explanation:
      "Light dependent reactions happen in the thylakoid membrane, where chlorophyll captures light energy.",
  },
  {
    qid: "q2",
    topicId: "calvin-cycle",
    stem: "What does the Calvin cycle use to build sugar?",
    options: [
      "ATP and NADPH from the light dependent reactions",
      "Oxygen released by the roots",
      "Chlorophyll molecules directly",
      "Water absorbed by the stomata",
    ],
    chosenIndex: 1,
    correct: false,
    answerIndex: 0,
    explanation:
      "The Calvin cycle uses the ATP and NADPH made during the light dependent reactions to fix carbon dioxide into sugar.",
  },
  {
    qid: "q3",
    topicId: "chlorophyll-and-pigments",
    stem: "Why do most leaves look green?",
    options: [
      "Chlorophyll reflects green light",
      "Chlorophyll absorbs green light",
      "Carotenoids block red light",
      "Stomata filter out green light",
    ],
    chosenIndex: 0,
    correct: true,
    answerIndex: 0,
    explanation:
      "Chlorophyll absorbs red and blue light well but reflects green light, which is why leaves look green.",
  },
  {
    qid: "q4",
    topicId: "factors-affecting-photosynthesis",
    stem: "A plant has plenty of light but very little carbon dioxide. What will help most?",
    options: [
      "Increasing the carbon dioxide supply",
      "Increasing the light intensity further",
      "Removing chlorophyll from the leaves",
      "Closing the stomata completely",
    ],
    chosenIndex: 1,
    correct: false,
    answerIndex: 0,
    explanation:
      "When carbon dioxide is the scarcest factor, adding more light will not speed up photosynthesis any further.",
  },
];

const topicResults: TopicResult[] = [
  { topicId: "light-dependent-reactions", name: "Light dependent reactions", correct: 5, total: 6, mastery: 0.83, weak: false },
  { topicId: "calvin-cycle", name: "The Calvin cycle", correct: 2, total: 7, mastery: 0.29, weak: true },
  { topicId: "chlorophyll-and-pigments", name: "Chlorophyll and pigments", correct: 4, total: 5, mastery: 0.8, weak: false },
  { topicId: "factors-affecting-photosynthesis", name: "Factors affecting the rate", correct: 1, total: 4, mastery: 0.25, weak: true },
];

export const fixtureAttemptResponse: AttemptResponse = {
  attempt: {
    id: "fixture-attempt-1",
    profileId: FIXTURE_PROFILE_ID,
    quizId: fixtureQuiz.id,
    materialId: fixtureMaterial.id,
    answers: questionResults.map(({ qid, chosenIndex, correct }) => ({ qid, chosenIndex, correct })),
    score: 0.5,
    completedAt: "2026-09-02T11:30:00.000Z",
  },
  results: questionResults,
  topicResults,
};

export const fixtureProgress: TopicProgress[] = [
  {
    topicId: "light-dependent-reactions",
    materialId: fixtureMaterial.id,
    name: "Light dependent reactions",
    attempts: 6,
    correct: 5,
    wrong: 1,
    mastery: 0.83,
    lastAttemptAt: "2026-09-02T11:30:00.000Z",
    weak: false,
    explanation: null,
    explanationAt: null,
  },
  {
    topicId: "calvin-cycle",
    materialId: fixtureMaterial.id,
    name: "The Calvin cycle",
    attempts: 7,
    correct: 2,
    wrong: 5,
    mastery: 0.29,
    lastAttemptAt: "2026-09-02T11:30:00.000Z",
    weak: true,
    explanation: "The Calvin cycle uses ATP and NADPH from the light reactions to turn carbon dioxide into sugar.",
    explanationAt: "2026-09-02T12:00:00.000Z",
  },
  {
    topicId: "chlorophyll-and-pigments",
    materialId: fixtureMaterial.id,
    name: "Chlorophyll and pigments",
    attempts: 5,
    correct: 4,
    wrong: 1,
    mastery: 0.8,
    lastAttemptAt: "2026-09-02T11:30:00.000Z",
    weak: false,
    explanation: null,
    explanationAt: null,
  },
  {
    topicId: "factors-affecting-photosynthesis",
    materialId: fixtureMaterial.id,
    name: "Factors affecting the rate",
    attempts: 4,
    correct: 1,
    wrong: 3,
    mastery: 0.25,
    lastAttemptAt: "2026-09-02T11:30:00.000Z",
    weak: true,
    explanation: null,
    explanationAt: null,
  },
  {
    topicId: "cell-membrane",
    materialId: fixtureMaterialSecondary.id,
    name: "The cell membrane",
    attempts: 3,
    correct: 3,
    wrong: 0,
    mastery: 1,
    lastAttemptAt: "2026-08-31T08:00:00.000Z",
    weak: false,
    explanation: null,
    explanationAt: null,
  },
];

// Not one of the five named fixture pieces, but PastScores (src/components/notes/PastScores.tsx)
// needs a small list of these and there is nowhere else for the dev preview
// page to get one.
export const fixtureAttemptSummaries: AttemptSummary[] = [
  {
    id: "fixture-attempt-1",
    quizId: fixtureQuiz.id,
    score: 0.5,
    questionCount: quizQuestions.length,
    completedAt: "2026-09-02T11:30:00.000Z",
    topicIds: fixtureQuiz.topicIds,
  },
  {
    id: "fixture-attempt-0",
    quizId: "fixture-quiz-0",
    score: 0.75,
    questionCount: 8,
    completedAt: "2026-08-27T15:00:00.000Z",
    topicIds: ["light-dependent-reactions", "chlorophyll-and-pigments"],
  },
];

export const fixtureMeResponse: MeResponse = {
  profileId: FIXTURE_PROFILE_ID,
  materials: [fixtureMaterialSecondary, fixtureMaterial],
  progress: fixtureProgress,
  latestFeedback:
    "You are solid on light dependent reactions and pigments: keep that up. The Calvin cycle and the factors that limit photosynthesis are still shaky, and both quizzes show guessing rather than recall. Next, reread the Calvin cycle explanation and note which molecule rubisco acts on, then retake a short quiz focused on limiting factors. A ten minute review of both before your next quiz should move them out of the weak range.",
  latestFeedbackAt: "2026-09-02T12:05:00.000Z",
  stats: {
    materials: 2,
    quizzesTaken: 3,
    averageScore: 0.62,
    weakTopics: 2,
  },
};

export const fixtureExplainResponse: ExplainResponse = {
  topicId: "calvin-cycle",
  name: "The Calvin cycle",
  explanation:
    "The Calvin cycle is the second stage of photosynthesis, and it is where a plant actually builds sugar. " +
    "It happens in the stroma, the fluid part of the chloroplast, and depends completely on the ATP and NADPH " +
    "made during the light dependent reactions. Without that supply of energy the Calvin cycle cannot run, " +
    "even when plenty of carbon dioxide is available.\n\n" +
    "The cycle starts when an enzyme called rubisco attaches a carbon dioxide molecule to a five carbon " +
    "molecule already waiting in the chloroplast. The resulting six carbon molecule is unstable and splits " +
    "in two right away. Over several turns of the cycle, these smaller molecules are rearranged and combined, " +
    "using up ATP and NADPH along the way, until enough carbon has been collected to release one molecule of " +
    "a simple sugar. The rest are recycled to keep the cycle going.\n\n" +
    "A common mix-up is thinking the Calvin cycle needs light directly. It does not: it only needs the " +
    "products of the light dependent reactions, which is why it can keep running briefly in the dark before " +
    "that supply runs out.",
  keyPoints: [
    "Takes place in the stroma, not the thylakoid membrane.",
    "Needs the ATP and NADPH made by the light dependent reactions.",
    "Rubisco attaches carbon dioxide to a five carbon molecule.",
    "Several turns of the cycle are needed to release one sugar molecule.",
    "Does not use light directly, only its products.",
  ],
  cached: true,
};
