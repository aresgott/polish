import type { Tone } from "../config/tone.js";
import { generateWithSystemPrompt } from "./generate-text.js";
import {
  buildCommitSystemPrompt,
  buildPrSystemPrompt,
  buildSystemPrompt,
} from "./prompt.js";

export async function polishText(text: string, tone: Tone): Promise<string> {
  return generateWithSystemPrompt(text, buildSystemPrompt(tone));
}

export async function generateCommitMessage(diff: string): Promise<string> {
  return generateWithSystemPrompt(diff, buildCommitSystemPrompt());
}

export async function generatePrDescription(context: string): Promise<string> {
  return generateWithSystemPrompt(context, buildPrSystemPrompt());
}
