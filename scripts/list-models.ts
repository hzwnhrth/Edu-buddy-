import { FREE_MODEL, PAID_MODEL, listOpenRouterModels, resolveModel } from "@/lib/ai/openrouter/client";
import { getEnv } from "@/lib/env";

// Prints every Gemma model OpenRouter currently offers (from the public
// GET https://openrouter.ai/api/v1/models endpoint, no key needed), and the
// model chain the app would use for real calls: OPENROUTER_MODEL when set,
// otherwise the free Gemma first with the paid Gemma as the quota fallback.
// Listing works without a key, but without OPENROUTER_API_KEY the app stays
// in mock mode and never calls any of these models.

function isGemma(id: string): boolean {
  return id.toLowerCase().includes("gemma");
}

async function main(): Promise<void> {
  const models = await listOpenRouterModels();
  const gemma = models.filter((model) => isGemma(model.id));

  if (gemma.length === 0) {
    console.log("OpenRouter currently lists no Gemma models.");
  } else {
    console.log(`OpenRouter lists ${gemma.length} Gemma model(s) of ${models.length} total:\n`);
    for (const model of gemma) {
      console.log(`- ${model.id} (${model.name})${model.free ? " - free" : ""}`);
    }
  }

  const configured = getEnv().openrouterModel;
  console.log(`\nModel chain the app would use with a key:`);
  if (configured) {
    console.log(`- ${configured} (OPENROUTER_MODEL is set, so it replaces the default chain)`);
  } else {
    console.log(`- ${FREE_MODEL} first, then ${PAID_MODEL} on a 429 or quota/credits error`);
  }
  console.log(`- first entry, as resolveModel() reports it: ${resolveModel()}`);

  if (!getEnv().openrouterApiKey) {
    console.log("\nOPENROUTER_API_KEY is not set, so the app runs in mock mode and calls none of these models.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
