export type PolishMode = "text" | "commit" | "pr";

const COMMIT_FLAGS = new Set(["--commit", "-c"]);
const PR_FLAGS = new Set(["--pr"]);

export function parseMode(argv: string[]): PolishMode {
  if (argv.some((arg) => COMMIT_FLAGS.has(arg))) return "commit";
  if (argv.some((arg) => PR_FLAGS.has(arg))) return "pr";
  return "text";
}

export function isModeFlag(arg: string): boolean {
  return COMMIT_FLAGS.has(arg) || PR_FLAGS.has(arg);
}

export const MODE_FLAG_ARGS = [...COMMIT_FLAGS, ...PR_FLAGS] as const;
