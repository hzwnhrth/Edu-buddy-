import { Suspense } from "react";
import { NotesGenerator } from "@/components/notes-gen/NotesGenerator";

// Notes Generator screen. The client screen reads the ?material= deep-link
// parameter, so it sits behind a Suspense boundary to keep prerendering happy.
export default function NotesPage() {
  return (
    <Suspense fallback={<div className="page-container" />}>
      <NotesGenerator />
    </Suspense>
  );
}
