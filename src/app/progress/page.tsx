"use client";

import { Suspense } from "react";
import { ProgressScreen } from "@/components/progress-page/ProgressScreen";

// The Progress screen. The client screen reads the ?topic= deep-link
// parameter, so it sits behind a Suspense boundary to keep prerendering
// happy.
export default function ProgressPage() {
  return (
    <Suspense fallback={<div className="page-container" />}>
      <ProgressScreen />
    </Suspense>
  );
}
