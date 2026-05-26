import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { parseProviderName, type Provider } from "./provider.js";

export const TONES = [
  "friendly",
  "official",
  "scientific",
  "political",
  "poetic",
] as const;
export type Tone = (typeof TONES)[number];

export const DEFAULT_TONE: Tone = "friendly";

export const TONE_REFERENCE = [
  {
    tone: "friendly",
    description: "Warm, casual, approachable",
    short: "-f",
    long: "-friendly, --friendly",
  },
  {
    tone: "official",
    description: "Formal, professional",
    short: "-o",
    long: "-official, --official",
  },
  {
    tone: "scientific",
    description: "Clear, objective, precise",
    short: "-s",
    long: "-scientific, --scientific, -scientifical",
  },
  {
    tone: "political",
    description: "Diplomatic, measured, neutral",
    short: "",
    long: "-political, --political",
  },
  {
    tone: "poetic",
    description: "Vivid, evocative, artistic",
    short: "",
    long: "-poetic, --poetic",
  },
] as const;

const TONE_ALIASES: Record<string, Tone> = {
  friendly: "friendly",
  f: "friendly",
  official: "official",
  o: "official",
  scientific: "scientific",
  scientifical: "scientific",
  s: "scientific",
  political: "political",
  p: "political",
  poetic: "poetic",
};

/** Short flags: -f -o -s (-p is reserved for --print) */
export const TONE_SHORT_FLAGS = ["-f", "-o", "-s"] as const;

const TONE_FLAGS = [
  ...TONES.flatMap((tone) => [
    `-${tone}`,
    `--${tone}`,
    ...(tone === "scientific" ? ["-scientifical", "--scientifical"] : []),
  ]),
  ...TONE_SHORT_FLAGS,
];

export function isToneFlag(arg: string): boolean {
  return TONE_FLAGS.includes(arg);
}

export function parseToneFlag(arg: string): Tone | null {
  const key = arg.replace(/^--?/, "").toLowerCase();
  return TONE_ALIASES[key] ?? null;
}

export function parseToneName(name: string): Tone | null {
  return TONE_ALIASES[name.trim().toLowerCase()] ?? null;
}

export function getConfigPath(): string {
  return join(homedir(), ".polish", "config.json");
}

export type PolishConfig = {
  tone: Tone;
  provider?: Provider;
};

export async function loadConfig(): Promise<PolishConfig> {
  try {
    const raw = await readFile(getConfigPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<PolishConfig>;
    const tone = parsed.tone ? parseToneName(parsed.tone) : null;
    const provider = parsed.provider ? parseProviderName(parsed.provider) : null;
    return { tone: tone ?? DEFAULT_TONE, provider: provider ?? undefined };
  } catch {
    return { tone: DEFAULT_TONE };
  }
}

export async function saveConfig(config: PolishConfig): Promise<void> {
  const dir = join(homedir(), ".polish");
  await mkdir(dir, { recursive: true });
  await writeFile(getConfigPath(), `${JSON.stringify(config, null, 2)}\n`, {
    mode: 0o600,
  });
}

export function extractToneFromArgv(argv: string[]): {
  tone: Tone | null;
  rest: string[];
} {
  let tone: Tone | null = null;
  const rest: string[] = [];

  for (const arg of argv) {
    if (isToneFlag(arg)) {
      tone = parseToneFlag(arg) ?? tone;
      continue;
    }
    rest.push(arg);
  }

  return { tone, rest };
}
