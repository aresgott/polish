import {
  DEFAULT_TONE,
  loadConfig,
  parseToneName,
  saveConfig,
  TONES,
  type Tone,
} from "../config/tone.js";

export async function configCommand(args: string[]): Promise<void> {
  const sub = args[0]?.toLowerCase();

  if (!sub || sub === "show" || sub === "get") {
    const config = await loadConfig();
    console.log(`tone: ${config.tone}`);
    if (config.provider) {
      console.log(`provider: ${config.provider}`);
    }
    console.log(`\nAvailable: ${TONES.join(", ")}`);
    console.log(`Config file: ~/.polish/config.json`);
    console.log(`Full help: polish --usage`);
    return;
  }

  const toneArg = sub === "set" ? args[1] : args[0];
  const tone = parseToneName(toneArg ?? "");

  if (!tone) {
    console.error(`Unknown tone: ${toneArg ?? "(none)"}`);
    console.error(`Use one of: ${TONES.join(", ")}`);
    console.error("\nExamples:");
    console.error("  polish config friendly");
    console.error("  polish config set official");
    process.exit(1);
  }

  await saveConfig({ tone });
  console.log(`Default tone set to: ${tone}`);
  const short: Partial<Record<Tone, string>> = {
    friendly: "f",
    official: "o",
    scientific: "s",
  };
  const hint = short[tone]
    ? `polish -${short[tone]} your text  (or polish -${tone})`
    : `polish -${tone} your text  (or polish --${tone})`;
  console.log(`Override for one run: ${hint}`);
}

export async function resolveTone(cliTone: Tone | null): Promise<Tone> {
  if (cliTone) return cliTone;
  const config = await loadConfig();
  return config.tone ?? DEFAULT_TONE;
}
