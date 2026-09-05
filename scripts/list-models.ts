import { listGeminiModels, resolveModel } from "@/lib/ai/gemini/client";
import { getEnv } from "@/lib/env";

// Prints every Gemini model this API key can see, whether each one
// supports generateContent, and which id resolveModel() would pick for a
// real AI call. Requires GEMINI_API_KEY; there is nothing useful to list
// without it.

async function main(): Promise<void> {
  const apiKey = getEnv().geminiApiKey;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set. Add it to .env.local (see .env.example) and try again.");
    process.exit(1);
    return;
  }

  const models = await listGeminiModels();
  if (models.length === 0) {
    console.log("This API key can see no models.");
  } else {
    console.log(`This API key can see ${models.length} model(s):\n`);
    for (const model of models) {
      const name = model.displayName ? `${model.id} (${model.displayName})` : model.id;
      console.log(`- ${name} - generateContent: ${model.supportsGenerateContent ? "yes" : "no"}`);
    }
  }

  const chosen = await resolveModel();
  console.log(`\nresolveModel() picks: ${chosen}`);
  if (getEnv().geminiModel) {
    console.log("(GEMINI_MODEL is set, so this is that configured value, not an automatic pick.)");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
