import { isToneFlag } from "../config/tone.js";
import { isModeFlag, parseMode, type PolishMode } from "./mode-flags.js";
import { isOutputFlag } from "./output-flags.js";

/** Parse text from a full shell command line (via zsh preexec hook). */
export function parsePolishLine(line: string): {
  text: string;
  print: boolean;
  noCopy: boolean;
  diff: boolean;
  mode: PolishMode;
} {
  let rest = line.trim();
  if (rest.startsWith("polish ")) {
    rest = rest.slice("polish ".length);
  } else if (rest === "polish") {
    return { text: "", print: false, noCopy: false, diff: false, mode: "text" };
  }

  const parts = rest.split(/\s+/).filter(Boolean);
  const print = parts.some((part) => part === "--print" || part === "-p");
  const noCopy = parts.some(
    (part) => part === "--no-copy" || part === "--np" || part === "-np",
  );
  const diff = parts.some((part) => part === "--diff");
  const mode = parseMode(parts);
  const textParts = parts.filter(
    (part) => !isToneFlag(part) && !isOutputFlag(part) && !isModeFlag(part),
  );

  return { text: textParts.join(" "), print, noCopy, diff, mode };
}
