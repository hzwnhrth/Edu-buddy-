"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { HiOutlineArrowPath } from "react-icons/hi2";
import { setActiveMaterialId } from "@/lib/active-material";
import { useApiMutation } from "@/lib/hooks/useApi";
import type { AnalyzePdfRequest, AnalyzeRequest, AnalyzeResponse } from "@/lib/api-types";
import { RecentMaterials } from "./RecentMaterials";
import { ResultView } from "./ResultView";
import { UploadCard, type NotesUploadPayload } from "./UploadCard";

type ScreenMode = "upload" | "result";

// The Notes Generator screen, a port of the reference design's page of the
// same name: the upload card, the spinner card while analyzing, and the
// result tabs. The analyze calls live here so their results and errors
// survive every switch between the upload view and the result view.
export function NotesGenerator() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const materialParam = searchParams.get("material");

  const [mode, setMode] = useState<ScreenMode>("upload");
  const [resultMaterialId, setResultMaterialId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const analyzeMutation = useApiMutation<AnalyzeRequest, AnalyzeResponse>("/api/analyze");
  const analyzePdfMutation = useApiMutation<AnalyzePdfRequest, AnalyzeResponse>("/api/analyze-pdf");

  // Opening a result, from whatever entry point, always makes that material
  // the active one for the Quiz Arena and the AI Tutor.
  const openMaterial = useCallback((materialId: string) => {
    setResultMaterialId(materialId);
    setMode("result");
  }, []);

  useEffect(() => {
    if (resultMaterialId) {
      setActiveMaterialId(resultMaterialId);
    }
  }, [resultMaterialId]);

  // Deep link handling: /notes?material=<id> opens that material's result
  // view directly. Only a change of the parameter triggers it, so clicks on
  // recent materials or a fresh generation are never fought over. Render-time
  // state adjustment, the pattern the codebase already uses for this.
  const [lastParam, setLastParam] = useState<string | null>(null);
  if (materialParam !== lastParam) {
    setLastParam(materialParam);
    if (materialParam) {
      openMaterial(materialParam);
    }
  }

  async function handleUploadSubmit(payload: NotesUploadPayload) {
    setAnalyzing(true);
    try {
      const result =
        payload.kind === "pdf"
          ? await analyzePdfMutation.run({
              title: payload.title,
              pdfBase64: payload.pdfBase64,
              sourceName: payload.sourceName,
              pageCount: payload.pageCount,
            })
          : await analyzeMutation.run({
              title: payload.title,
              text: payload.text,
              sourceName: payload.sourceName,
              pageCount: payload.pageCount,
            });
      if (result) {
        openMaterial(result.material.id);
      }
    } finally {
      setAnalyzing(false);
    }
  }

  function handleNewDocument() {
    setMode("upload");
    if (materialParam) {
      // Drop the deep-link parameter so this screen does not pull the same
      // result view straight back up.
      router.replace("/notes");
    }
  }

  // Only one of the two mutations ever runs, chosen by the upload mode; the
  // other keeps its untouched initial state.
  const submitError = analyzeMutation.error ?? analyzePdfMutation.error;
  const submitNotReady = analyzeMutation.notReady || analyzePdfMutation.notReady;

  return (
    <motion.div
      className="page-container"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div
        className="page-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}
      >
        <div>
          <h1>Notes Generator</h1>
          <p>Upload a PDF lecture or syllabus and let EduBuddy create your study materials.</p>
        </div>
        {mode === "result" && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleNewDocument}
            style={{ borderRadius: "9999px" }}
          >
            <HiOutlineArrowPath /> New Document
          </button>
        )}
      </div>

      {mode === "upload" && (
        <motion.div className="card" initial={{ scale: 0.97 }} animate={{ scale: 1 }}>
          <UploadCard
            analyzing={analyzing}
            submitError={submitError}
            submitNotReady={submitNotReady}
            onSubmit={(payload) => void handleUploadSubmit(payload)}
          />
          {!analyzing && <RecentMaterials onOpen={openMaterial} />}
        </motion.div>
      )}

      {mode === "result" && resultMaterialId && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <ResultView key={resultMaterialId} materialId={resultMaterialId} />
        </motion.div>
      )}
    </motion.div>
  );
}
