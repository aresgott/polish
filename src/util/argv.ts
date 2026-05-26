import { parseProviderName } from "../config/provider.js";
import type { Provider } from "../config/provider.js";
import type { Tone } from "../config/tone.js";
import { extractToneFromArgv, isToneFlag } from "../config/tone.js";
import { isModeFlag, parseMode, type PolishMode } from "./mode-flags.js";
import {
  hasDiffFlag,
  hasNoCopyFlag,
  hasPrintFlag,
  isOutputFlag,
} from "./output-flags.js";
import { parsePolishLine } from "./line-parse.js";

const FLAGS = new Set([
  "--print",
  "-p",
  "--no-copy",
  "--np",
  "-np",
  "--diff",
  "--commit",
  "-c",
  "--pr",
  "-h",
  "--help",
  "--usage",
  "--donate",
  "--coffee",
  "-V",
  "--version",
  "-",
  "--stdin",
  "--from-line",
]);

function wantsHelp(argv: string[]): boolean {
  return argv.includes("-h") || argv.includes("--help") || argv.includes("--usage");
}

function wantsDonate(argv: string[]): boolean {
  return argv.includes("--donate") || argv.includes("--coffee");
}
const SUBCOMMANDS = new Set(["login", "logout", "shell-init", "config", "update"]);

export type ParsedArgv =
  | { command: "help" }
  | { command: "donate" }
  | { command: "version" }
  | { command: "login"; device: boolean; provider: Provider | null }
  | { command: "logout" }
  | { command: "shell-init"; shell: string }
  | { command: "config"; args: string[] }
  | { command: "update" }
  | {
      command: "polish";
      text: string;
      print: boolean;
      noCopy: boolean;
      diff: boolean;
      stdin: boolean;
      mode: PolishMode;
      tone: Tone | null;
    };

export function parseArgv(argv = process.argv.slice(2)): ParsedArgv {
  if (wantsHelp(argv)) {
    return { command: "help" };
  }

  if (wantsDonate(argv)) {
    return { command: "donate" };
  }

  if (argv.includes("-V") || argv.includes("--version")) {
    return { command: "version" };
  }

  if (argv[0] === "login") {
    const rest = argv.slice(1);
    let provider: Provider | null = null;
    for (const arg of rest) {
      if (arg === "--device") continue;
      const parsed = parseProviderName(arg);
      if (parsed) provider = parsed;
    }
    return {
      command: "login",
      device: rest.includes("--device"),
      provider,
    };
  }

  if (argv[0] === "logout") {
    return { command: "logout" };
  }

  if (argv[0] === "shell-init") {
    return { command: "shell-init", shell: argv[1] ?? "zsh" };
  }

  if (argv[0] === "config") {
    return { command: "config", args: argv.slice(1) };
  }

  if (argv[0] === "update") {
    return { command: "update" };
  }

  const fromLineIdx = argv.indexOf("--from-line");
  if (fromLineIdx >= 0) {
    const line = argv[fromLineIdx + 1] ?? "";
    const parsed = parsePolishLine(line);
    const { tone } = extractToneFromArgv(argv);
    return {
      command: "polish",
      text: parsed.text,
      print: parsed.print,
      noCopy: parsed.noCopy,
      diff: parsed.diff,
      stdin: false,
      mode: parsed.mode,
      tone,
    };
  }

  const print = hasPrintFlag(argv);
  const noCopy = hasNoCopyFlag(argv);
  const diff = hasDiffFlag(argv);
  const stdin = argv.includes("-") || argv.includes("--stdin");
  const mode = parseMode(argv);
  const { tone, rest } = extractToneFromArgv(argv);

  const text = rest
    .filter(
      (arg) =>
        !FLAGS.has(arg) &&
        !SUBCOMMANDS.has(arg) &&
        !isOutputFlag(arg) &&
        !isModeFlag(arg) &&
        !isToneFlag(arg),
    )
    .join(" ")
    .trim();

  return { command: "polish", text, print, noCopy, diff, stdin, mode, tone };
}
