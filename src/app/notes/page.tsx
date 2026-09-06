import { Suspense } from "react";
import { NotesWorkspace } from "@/components/notes-gen/NotesWorkspace";

// Notes Generator screen. The client screen reads the ?material= deep-link
// parameter, so it sits behind a Suspense boundary to keep prerendering happy.
export default function NotesPage() {
  return (
    <Suspense fallback={<div className="page-container" />}>
      <NotesWorkspace />
    </Suspense>
  );
}
