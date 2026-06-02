import { approveAll } from "@github/copilot-sdk";
import { withPolishCopilotClient } from "../auth/copilot-client.js";
import { hasCopilotAuth } from "../auth/copilot-auth.js";
import { cleanModelOutput } from "./response-clean.js";

const PREFERRED_MODELS = [
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-5-mini",
  "gpt-5",
  "gpt-5.2",
  "gpt-5.4",
];

const SEND_TIMEOUT_MS = 120_000;

export async function generateWithCopilot(
  input: string,
  system: string,
): Promise<string> {
  if (!(await hasCopilotAuth())) {
    throw new Error("Not logged in to GitHub Copilot. Run: polish login copilot");
  }

  let lastError: unknown;

  return withPolishCopilotClient(async (client) => {
    for (const modelId of PREFERRED_MODELS) {
      try {
        const session = await client.createSession({
          model: modelId,
          clientName: "polish",
          onPermissionRequest: approveAll,
          skipCustomInstructions: true,
          systemMessage: {
            mode: "replace",
            content: system,
          },
        });

        try {
          const response = await session.sendAndWait(
            { prompt: input },
            SEND_TIMEOUT_MS,
          );
          const text = cleanModelOutput(response?.data.content ?? "");
          if (text) return text;
        } finally {
          await session.disconnect();
        }
      } catch (err) {
        lastError = err;
        const message = err instanceof Error ? err.message : String(err);
        if (/model/i.test(message) && /not found|invalid|unsupported/i.test(message)) {
          continue;
        }
      }
    }

    throw lastError ?? new Error("Failed to generate text with any available Copilot model.");
  });
}
