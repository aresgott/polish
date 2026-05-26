export const PRINT_FLAGS = new Set(["--print", "-p"]);
export const NO_COPY_FLAGS = new Set(["--no-copy", "--np", "-np"]);
export const DIFF_FLAGS = new Set(["--diff"]);

export function hasPrintFlag(argv: string[]): boolean {
  return argv.some((arg) => PRINT_FLAGS.has(arg));
}

export function hasNoCopyFlag(argv: string[]): boolean {
  return argv.some((arg) => NO_COPY_FLAGS.has(arg));
}

export function hasDiffFlag(argv: string[]): boolean {
  return argv.some((arg) => DIFF_FLAGS.has(arg));
}

export function isOutputFlag(arg: string): boolean {
  return PRINT_FLAGS.has(arg) || NO_COPY_FLAGS.has(arg) || DIFF_FLAGS.has(arg);
}
