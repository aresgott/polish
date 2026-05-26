import { generateText } from "ai";
import { createOpenAIOAuth } from "openai-oauth-provider";
import { getCodexAuthPath } from "../auth/codex-auth.js";
import { resolveActiveProvider } from "../auth/provider-auth.js";
import type { Provider } from "../config/provider.js";
import { generateWithClaude } from "./generate-claude.js";

const PREFERRED_MODELS = [
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-5-mini",
  "gpt-5",
  "gpt-5.4",
  "gpt-5.3-codex",
];

export async function generateWithSystemPrompt(
  input: string,
  system: string,
  provider?: Provider,
): Promise<string> {
  const active = provider ?? (await resolveActiveProvider());

  if (active === "claude") {
    return generateWithClaude(input, system);
  }
  const openai = createOpenAIOAuth({
    authFilePath: getCodexAuthPath(),
  });

  let lastError: unknown;

  for (const modelId of PREFERRED_MODELS) {
    try {
      const result = await generateText({
        model: openai(modelId),
        system,
        prompt: input,
      });
      const text = result.text.trim();
      if (text) return text;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError ?? new Error("Failed to generate text with any available model.");
}
