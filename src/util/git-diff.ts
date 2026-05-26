import { execFileSync } from "node:child_process";

const MAX_DIFF_CHARS = 100_000;

function runGit(args: string[]): string {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      maxBuffer: 12 * 1024 * 1024,
    }).trim();
  } catch {
    return "";
  }
}

function truncate(text: string): string {
  if (text.length <= MAX_DIFF_CHARS) return text;
  return `${text.slice(0, MAX_DIFF_CHARS)}\n\n[diff truncated — ${text.length - MAX_DIFF_CHARS} chars omitted]`;
}

function guessPrBase(): string {
  const upstream = runGit(["rev-parse", "--abbrev-ref", "@{upstream}"]);
  if (upstream.includes("/")) {
    return upstream;
  }

  for (const ref of ["origin/main", "origin/master", "main", "master"]) {
    if (runGit(["rev-parse", "--verify", ref])) {
      return ref;
    }
  }

  return "HEAD~1";
}

export function getStagedDiff(): string {
  const staged = runGit(["diff", "--staged"]);
  if (staged) return truncate(staged);
  return truncate(runGit(["diff"]));
}

export function getPrDiffContext(): string {
  const base = guessPrBase();
  const diff = truncate(runGit(["diff", `${base}...HEAD`]));
  const log = runGit(["log", "--oneline", `${base}..HEAD`]);
  const branch = runGit(["rev-parse", "--abbrev-ref", "HEAD"]);

  const parts = [`Branch: ${branch || "unknown"}`, `Base: ${base}`];
  if (log) parts.push("", "Commits:", log);
  if (diff) parts.push("", "Diff:", diff);
  return parts.join("\n");
}

export function isInsideGitRepo(): boolean {
  return runGit(["rev-parse", "--is-inside-work-tree"]) === "true";
}
