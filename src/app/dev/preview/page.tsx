"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { DashboardActions } from "@/components/dashboard/DashboardActions";
import { FeedbackCard } from "@/components/dashboard/FeedbackCard";
import { MaterialsList } from "@/components/dashboard/MaterialsList";
import { ProgressPanel } from "@/components/dashboard/ProgressPanel";
import { ReviewQueue } from "@/components/dashboard/ReviewQueue";
import {
  fixtureAttemptResponse,
  fixtureAttemptSummaries,
  fixtureExplainResponse,
  fixtureMaterial,
  fixtureMaterialSecondary,
  fixtureMeResponse,
  fixtureProgress,
  fixtureQuiz,
} from "@/components/fixtures";
import { PastScores } from "@/components/notes/PastScores";
import { TopicList } from "@/components/notes/TopicList";
import { QuestionReview } from "@/components/results/QuestionReview";
import { ScoreSummary } from "@/components/results/ScoreSummary";
import { TopicBars } from "@/components/results/TopicBars";
import { QuizRunner } from "@/components/quiz/QuizRunner";
import { Explanation } from "@/components/study/Explanation";
import { UploadForm } from "@/components/upload/UploadForm";

// Renders every screen-level component against the fixtures, one section
// per component, so they can all be checked in one place without wiring up
// real API responses. Never ships: it 404s itself as soon as this is a
// production build.
export default function DevPreviewPage() {
  // All hooks run unconditionally, above the production check: calling
  // notFound() (which throws) before them would make the set of hooks this
  // component calls depend on a condition, which is exactly what the rules
  // of hooks forbid, even though process.env.NODE_ENV never actually
  // changes within a running process.
  const [selectedTopicIds, setSelectedTopicIds] = useState<Set<string>>(
    () => new Set(fixtureMaterial.topics.map((topic) => topic.id))
  );

  const questionReviewEntries = useMemo(
    () =>
      fixtureAttemptResponse.results.map((result) => {
        const question = fixtureQuiz.questions.find((item) => item.qid === result.qid);
        return {
          qid: result.qid,
          stem: question?.stem ?? "Question no longer available",
          options: question?.options ?? [],
          result,
        };
      }),
    []
  );

  // Every real screen only ever runs format.ts's viewer-locale date helpers
  // after a client-side fetch resolves, so they never execute during server
  // rendering there. This page is different: it feeds fixture data straight
  // into the same components, synchronously, which makes those helpers run
  // during the server render too. Node's default Intl locale and the
  // browser's do not always agree on date formatting, so that server render
  // and the client's hydration render can disagree on the resulting text,
  // which React reports as a hydration mismatch. Rendering nothing until
  // after mount sidesteps it cleanly: the server and the pre-hydration
  // client render both produce the same "not mounted yet" output, and the
  // fixtures only render once we are safely client-side.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Unlike the render-time fixes elsewhere in this codebase, there is no
    // alternative to a synchronous setState here: detecting "the client has
    // hydrated" is precisely what an effect with no dependencies is for,
    // since effects never run during server rendering. This is the standard
    // hasMounted/isClient pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  if (!mounted) {
    return null;
  }

  function toggleTopic(topicId: string) {
    setSelectedTopicIds((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Component preview</h1>
        <p className="mt-1 text-base text-muted">
          Every screen-level component, rendered against the fixtures in src/components/fixtures.ts.
          Development only.
        </p>
      </div>

      <PreviewSection title="DashboardActions">
        <DashboardActions />
      </PreviewSection>

      <PreviewSection title="MaterialsList">
        <MaterialsList materials={[fixtureMaterialSecondary, fixtureMaterial]} />
      </PreviewSection>

      <PreviewSection title="MaterialsList (empty state)">
        <MaterialsList materials={[]} />
      </PreviewSection>

      <PreviewSection title="ProgressPanel">
        <ProgressPanel stats={fixtureMeResponse.stats} />
      </PreviewSection>

      <PreviewSection title="ReviewQueue">
        <ReviewQueue progress={fixtureProgress} />
      </PreviewSection>

      <PreviewSection title="ReviewQueue (nothing due)">
        <ReviewQueue
          progress={fixtureProgress.map((topic) => ({
            ...topic,
            weak: false,
            lastAttemptAt: new Date().toISOString(),
          }))}
        />
      </PreviewSection>

      <PreviewSection title="ReviewQueue (empty state, not rendered)">
        <ReviewQueue progress={[]} />
      </PreviewSection>

      <PreviewSection title="FeedbackCard">
        <FeedbackCard
          feedback={fixtureMeResponse.latestFeedback}
          feedbackAt={fixtureMeResponse.latestFeedbackAt}
        />
      </PreviewSection>

      <PreviewSection title="FeedbackCard (empty state)">
        <FeedbackCard feedback={null} feedbackAt={null} />
      </PreviewSection>

      <PreviewSection title="UploadForm">
        <UploadForm />
      </PreviewSection>

      <PreviewSection title="TopicList">
        <TopicList
          topics={fixtureMaterial.topics}
          selectedIds={selectedTopicIds}
          onToggle={toggleTopic}
          progress={fixtureProgress}
        />
      </PreviewSection>

      <PreviewSection title="PastScores">
        <PastScores materialId={fixtureMaterial.id} attempts={fixtureAttemptSummaries} />
      </PreviewSection>

      <PreviewSection title="PastScores (empty state)">
        <PastScores materialId={fixtureMaterial.id} attempts={[]} />
      </PreviewSection>

      <PreviewSection title="QuizRunner">
        <QuizRunner quiz={fixtureQuiz} materialId={fixtureMaterial.id} />
      </PreviewSection>

      <PreviewSection title="ScoreSummary">
        <ScoreSummary
          score={fixtureAttemptResponse.attempt.score}
          correctCount={fixtureAttemptResponse.results.filter((result) => result.correct).length}
          totalCount={fixtureAttemptResponse.results.length}
          completedAt={fixtureAttemptResponse.attempt.completedAt}
        />
      </PreviewSection>

      <PreviewSection title="TopicBars">
        <TopicBars topicResults={fixtureAttemptResponse.topicResults} />
      </PreviewSection>

      <PreviewSection title="QuestionReview">
        <QuestionReview entries={questionReviewEntries} />
      </PreviewSection>

      <PreviewSection title="Explanation">
        <Explanation data={fixtureExplainResponse} onRegenerate={() => {}} regenerating={false} />
      </PreviewSection>
    </div>
  );
}

function PreviewSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-ink">{title}</h2>
      <div className="rounded-card border border-dashed border-border p-4">{children}</div>
    </section>
  );
}
