import { diffWordsWithSpace } from "diff";

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

/** Word-level diff with red removals and green additions. */
export function formatColoredWordDiff(
  before: string,
  after: string,
  color: boolean,
): string {
  const parts = diffWordsWithSpace(before, after);

  if (!color) {
    return parts
      .map((part) => {
        if (part.removed) return `[-${part.value}]`;
        if (part.added) return `[+${part.value}]`;
        return part.value;
      })
      .join("");
  }

  return parts
    .map((part) => {
      if (part.removed) return `${RED}${part.value}${RESET}`;
      if (part.added) return `${GREEN}${part.value}${RESET}`;
      return part.value;
    })
    .join("");
}

export function writePolishDiff(
  before: string,
  after: string,
  stream: NodeJS.WriteStream,
): void {
  const colored = formatColoredWordDiff(before, after, Boolean(stream.isTTY));
  stream.write(`${DIM}── changes ──${RESET}\n${colored}\n`);
}
