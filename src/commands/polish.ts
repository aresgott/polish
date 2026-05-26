import clipboard from "clipboardy";
import { closeSync, openSync, readSync } from "node:fs";
import {
  generateCommitMessage,
  generatePrDescription,
  polishText,
} from "../ai/polish-text.js";
import { isLoggedIn } from "../auth/provider-auth.js";
import type { Tone } from "../config/tone.js";
import { resolveTone } from "./config.js";
import { getPrDiffContext, getStagedDiff, isInsideGitRepo } from "../util/git-diff.js";
import { readStdin } from "../util/input.js";
import type { PolishMode } from "../util/mode-flags.js";
import { withInlineSpinner } from "../util/spinner.js";
import { isStdinPiped, isStdoutPiped } from "../util/tty.js";
import {
  buildCommandPreview,
  clipboardSuccessLabel,
  isInteractiveDisplay,
  writeCommandLine,
  writeCopiedLine,
  writeResultLine,
  writeStatusLine,
} from "../util/terminal-ui.js";
import { writePolishDiff } from "../util/text-diff.js";
import { normalizeInput } from "../util/text.js";

async function readClipboard(): Promise<string> {
  try {
    return (await clipboard.read()).trim();
  } catch {
    console.error("Could not read from clipboard.");
    process.exit(1);
  }
}

async function readInteractivePaste(): Promise<string> {
  const eofHint = process.platform === "win32" ? "Ctrl-Z then Enter" : "Ctrl-D";
  console.log(`Paste your text (supports ', "), then press ${eofHint}:\n`);

  if (process.platform === "win32") {
    const { createInterface } = await import("node:readline");
    const rl = createInterface({ input: process.stdin, terminal: false });
    const lines: string[] = [];
    for await (const line of rl) lines.push(line);
    return lines.join("\n").trim();
  }

  const ttyFd = openSync("/dev/tty", "r");
  const chunks: Buffer[] = [];
  const buf = Buffer.alloc(4096);
  let n: number;
  while ((n = readSync(ttyFd, buf, 0, buf.length, null)) > 0) {
    chunks.push(Buffer.from(buf.subarray(0, n)));
  }
  closeSync(ttyFd);
  return Buffer.concat(chunks).toString("utf8").trim();
}

async function resolveInput(
  text: string,
  options: { stdin?: boolean; mode: PolishMode },
): Promise<string> {
  let input = text.trim();
  const stdinPiped = isStdinPiped();
  const fromStdin = options.stdin || stdinPiped;

  if (options.mode === "commit") {
    if (fromStdin && !input) {
      input = await readStdin();
    } else if (!input) {
      if (!isInsideGitRepo()) {
        console.error("Not in a git repo. Pipe a diff: git diff | polish -c");
        process.exit(1);
      }
      input = getStagedDiff();
    }
    if (!input.trim()) {
      console.error("No diff found. Stage changes or pipe one: git diff | polish -c");
      process.exit(1);
    }
    return input;
  }

  if (options.mode === "pr") {
    if (fromStdin && !input) {
      input = await readStdin();
    } else if (!input) {
      if (!isInsideGitRepo()) {
        console.error("Not in a git repo. Pipe a diff: git diff main...HEAD | polish --pr");
        process.exit(1);
      }
      input = getPrDiffContext();
    }
    if (!input.trim()) {
      console.error("No changes found vs base branch. Pipe a diff: git diff | polish --pr");
      process.exit(1);
    }
    return input;
  }

  if (fromStdin && !input) {
    input = await readStdin();
  } else if (!input && !stdinPiped) {
    input = await readClipboard();
    if (!input) {
      input = await readInteractivePaste();
    }
  }

  return normalizeInput(input);
}

function spinnerLabel(mode: PolishMode, input: string): string {
  if (mode === "commit") return "Writing commit message…";
  if (mode === "pr") return "Writing PR description…";
  return input;
}

export async function polishCommand(
  text: string,
  options: {
    print?: boolean;
    noCopy?: boolean;
    diff?: boolean;
    stdin?: boolean;
    mode?: PolishMode;
    tone?: Tone | null;
  },
): Promise<void> {
  if (!(await isLoggedIn())) {
    console.error("Not logged in. Run: polish login");
    process.exit(1);
  }

  const mode = options.mode ?? "text";
  const inlineArg = text.trim();
  const showDiff = Boolean(options.diff);
  const stdinPiped = isStdinPiped();
  const prosePiped = stdinPiped && mode === "text";
  const interactive = isInteractiveDisplay() && !prosePiped;
  const clipboardUiShown =
    interactive &&
    mode === "text" &&
    !inlineArg &&
    !options.stdin &&
    !stdinPiped;

  if (showDiff && mode !== "text") {
    console.error("--diff is only supported for normal polish (not -c or --pr).");
    process.exit(1);
  }

  if (clipboardUiShown) {
    writeCommandLine(buildCommandPreview("", mode));
    writeStatusLine("reading clipboard...");
  }

  const input = await resolveInput(text, { stdin: options.stdin, mode });

  if (!input) {
    console.error(
      "No text provided.\n" +
        "  polish your text here\n" +
        "  polish              (read from clipboard)\n" +
        "  cat summary.txt | polish\n" +
        "  git diff | polish -c\n" +
        "  polish --pr\n\n" +
        "For apostrophes (don't), run once:\n" +
        "  polish shell-init zsh >> ~/.zshrc && source ~/.zshrc",
    );
    process.exit(1);
  }

  const tone = await resolveTone(options.tone ?? null);
  const stdoutPiped = isStdoutPiped();
  // Piped prose prints to stdout; -c/--pr follow the same -p/-np rules with or without stdin pipe.
  const print = options.print || options.noCopy || stdoutPiped || prosePiped;
  const noCopy = options.noCopy || stdoutPiped || prosePiped;

  try {
    const work = async () => {
      if (mode === "commit") return generateCommitMessage(input);
      if (mode === "pr") return generatePrDescription(input);
      return polishText(input, tone);
    };

    const result = await withInlineSpinner(work, spinnerLabel(mode, input));

    if (interactive) {
      if (!clipboardUiShown) {
        writeCommandLine(buildCommandPreview(inlineArg, mode));
      }
      writeResultLine(result);
    } else if (print) {
      console.log(result);
    }

    if (showDiff) {
      const diffStream = stdoutPiped ? process.stderr : process.stdout;
      writePolishDiff(input, result, diffStream);
    }

    if (noCopy) {
      return;
    }

    try {
      await clipboard.write(result);
      if (interactive) {
        writeCopiedLine(mode);
      } else {
        console.log(clipboardSuccessLabel(mode, false));
      }
    } catch {
      console.error("Could not copy to clipboard. Use -p/--print or -np/--no-copy to see the result.");
      if (!print) {
        console.log(result);
      }
      process.exit(1);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/invalidat|unauthorized|401/i.test(message)) {
      console.error("Session expired. Run: polish logout && polish login");
      process.exit(1);
    }
    const action =
      mode === "commit"
        ? "commit message"
        : mode === "pr"
          ? "PR description"
          : "text";
    console.error(`Failed to generate ${action}: ${message}`);
    process.exit(1);
  }
}
