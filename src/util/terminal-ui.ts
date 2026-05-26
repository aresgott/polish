import type { PolishMode } from "./mode-flags.js";
import { isStdoutPiped } from "./tty.js";

/** Cyan prompt `$` (mockup). */
const CYAN = "\x1b[36m";
/** Dim cyan for `→` status lines (mockup). */
const MUTED = "\x1b[2;36m";
/** Success checkmark + label (mockup). */
const GREEN = "\x1b[32m";
const RESET = "\x1b[0m";

/** True when we can render the interactive polish preview (terminal UI). */
export function isInteractiveDisplay(): boolean {
  return Boolean(process.stdout.isTTY) && !isStdoutPiped();
}

export function buildCommandPreview(inlineText: string, mode: PolishMode): string {
  if (mode === "commit") return "polish -c";
  if (mode === "pr") return "polish --pr";

  const trimmed = inlineText.trim();
  if (!trimmed) return "polish";

  const quote = trimmed.includes('"') ? "'" : '"';
  const display = trimmed.length > 72 ? `${trimmed.slice(0, 69)}…` : trimmed;
  return `polish ${quote}${display}${quote}`;
}

export function clipboardSuccessLabel(mode: PolishMode, short: boolean): string {
  if (short) {
    if (mode === "commit") return "commit message copied to clipboard.";
    if (mode === "pr") return "PR description copied to clipboard.";
    return "copied to clipboard.";
  }
  if (mode === "commit") return "Commit message copied to clipboard.";
  if (mode === "pr") return "PR description copied to clipboard.";
  return "Polished text copied to clipboard.";
}

export function writeCommandLine(commandPreview: string): void {
  console.log(`${CYAN}$${RESET} ${commandPreview}`);
}

export function writeStatusLine(message: string): void {
  console.log(`${MUTED}→ ${message}${RESET}`);
}

export function writeResultLine(result: string): void {
  const lines = result.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    if (i === 0) {
      console.log(`${MUTED}→${RESET} ${line}`);
    } else {
      console.log(`  ${line}`);
    }
  }
}

export function writeCopiedLine(mode: PolishMode): void {
  const label = clipboardSuccessLabel(mode, true);
  console.log(`${GREEN}✓ ${label}${RESET}`);
}
