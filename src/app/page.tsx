"use client";

import { DashboardActions } from "@/components/dashboard/DashboardActions";
import { FeedbackCard } from "@/components/dashboard/FeedbackCard";
import { MaterialsList } from "@/components/dashboard/MaterialsList";
import { ProgressPanel } from "@/components/dashboard/ProgressPanel";
import { ReviewQueue } from "@/components/dashboard/ReviewQueue";
import { ErrorNotice, LoadingNotice, NotReadyNotice } from "@/components/status/StateNotice";
import { PageHeader } from "@/components/ui/PageHeader";
import { useApiQuery } from "@/lib/hooks/useApi";
import type { MeResponse } from "@/lib/api-types";

// The dashboard: recent notes, overall mastery, a "Review today" queue and
// the latest study plan. Loads everything from GET /api/me in one call. The
// upload actions do not depend on that call, so they render immediately.
export default function DashboardPage() {
  const { data, error, loading, notReady, reload } = useApiQuery<MeResponse>("/api/me");

  return (
    <>
      <PageHeader
        title="Your study dashboard"
        subtitle="Recent notes, overall mastery and your latest study plan."
      />
      <div className="flex flex-col gap-6">
        <DashboardActions />

        {loading ? <LoadingNotice label="Loading your dashboard..." /> : null}
        {notReady ? <NotReadyNotice /> : null}
        {error ? <ErrorNotice message={error} onRetry={reload} /> : null}

        {data ? (
          <>
            <ReviewQueue progress={data.progress} />
            <MaterialsList materials={data.materials} />
            {data.materials.length > 0 ? (
              <>
                <ProgressPanel stats={data.stats} />
                <FeedbackCard feedback={data.latestFeedback} feedbackAt={data.latestFeedbackAt} />
              </>
            ) : null}
          </>
        ) : null}
      </div>
    </>
  );
}
