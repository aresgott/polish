/** True when stdin is not a terminal (e.g. `cat file | polish`). */
export function isStdinPiped(): boolean {
  return !process.stdin.isTTY;
}

/** True when stdout is not a terminal (e.g. `polish | wc`). */
export function isStdoutPiped(): boolean {
  return !process.stdout.isTTY;
}
