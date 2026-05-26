/** 9-dot square on one line (3×3 groups); frame 9 lights all dots. */
const CHASE = [0, 1, 2, 5, 8, 7, 6, 3, 4, -1] as const;

const DIM = "·";
const ON = "●";

function isInteractiveTerminal(): boolean {
  return Boolean(process.stderr.isTTY);
}

function terminalColumns(): number {
  const cols = process.stderr.columns;
  return cols && cols > 0 ? cols : 80;
}

/** Visible width of the 3×3 dot grid plus the two spaces before it. */
const SPINNER_VISIBLE_WIDTH = 13;

function buildInlineSquare(active: number): string {
  const cells = Array<string>(9).fill(DIM);
  if (active === -1) {
    for (let i = 0; i < 9; i += 1) cells[i] = ON;
  } else {
    cells[active] = ON;
  }

  return `${cells[0]}${cells[1]}${cells[2]} ${cells[3]}${cells[4]}${cells[5]} ${cells[6]}${cells[7]}${cells[8]}`;
}

function truncateForDisplay(text: string, max: number): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (max < 4) return oneLine.slice(0, max);
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max - 1)}…`;
}

function maxPrefixWidth(): number {
  return Math.max(16, terminalColumns() - SPINNER_VISIBLE_WIDTH);
}

export async function withInlineSpinner<T>(
  work: () => Promise<T>,
  inputPreview: string,
): Promise<T> {
  if (!isInteractiveTerminal()) {
    process.stderr.write("Polishing…\n");
    return work();
  }

  const prefix = truncateForDisplay(inputPreview, maxPrefixWidth());
  let frame = 0;
  let timer: ReturnType<typeof setInterval> | undefined;

  const render = () => {
    const square = buildInlineSquare(CHASE[frame % CHASE.length]!);
    frame += 1;
    process.stderr.write(`\r\x1b[2K${prefix}  \x1b[36m${square}\x1b[0m`);
  };

  render();
  timer = setInterval(render, 110);

  try {
    return await work();
  } finally {
    if (timer) clearInterval(timer);
    process.stderr.write("\r\x1b[2K");
  }
}
