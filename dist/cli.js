#!/usr/bin/env node

// src/config/tone.ts
import { mkdir, readFile, writeFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

// src/config/provider.ts
var PROVIDERS = ["chatgpt", "claude"];
var PROVIDER_LABELS = {
  chatgpt: "ChatGPT (Codex OAuth)",
  claude: "Claude (subscription OAuth)"
};
function parseProviderName(name) {
  const key = name.trim().toLowerCase();
  return PROVIDERS.includes(key) ? key : null;
}
async function loadProvider() {
  const config = await loadConfig();
  return config.provider ?? null;
}
async function saveProvider(provider) {
  const config = await loadConfig();
  await saveConfig({ ...config, provider });
}

// src/config/tone.ts
var TONES = [
  "friendly",
  "official",
  "scientific",
  "political",
  "poetic"
];
var DEFAULT_TONE = "friendly";
var TONE_REFERENCE = [
  {
    tone: "friendly",
    description: "Warm, casual, approachable",
    short: "-f",
    long: "-friendly, --friendly"
  },
  {
    tone: "official",
    description: "Formal, professional",
    short: "-o",
    long: "-official, --official"
  },
  {
    tone: "scientific",
    description: "Clear, objective, precise",
    short: "-s",
    long: "-scientific, --scientific, -scientifical"
  },
  {
    tone: "political",
    description: "Diplomatic, measured, neutral",
    short: "",
    long: "-political, --political"
  },
  {
    tone: "poetic",
    description: "Vivid, evocative, artistic",
    short: "",
    long: "-poetic, --poetic"
  }
];
var TONE_ALIASES = {
  friendly: "friendly",
  f: "friendly",
  official: "official",
  o: "official",
  scientific: "scientific",
  scientifical: "scientific",
  s: "scientific",
  political: "political",
  p: "political",
  poetic: "poetic"
};
var TONE_SHORT_FLAGS = ["-f", "-o", "-s"];
var TONE_FLAGS = [
  ...TONES.flatMap((tone) => [
    `-${tone}`,
    `--${tone}`,
    ...tone === "scientific" ? ["-scientifical", "--scientifical"] : []
  ]),
  ...TONE_SHORT_FLAGS
];
function isToneFlag(arg) {
  return TONE_FLAGS.includes(arg);
}
function parseToneFlag(arg) {
  const key = arg.replace(/^--?/, "").toLowerCase();
  return TONE_ALIASES[key] ?? null;
}
function parseToneName(name) {
  return TONE_ALIASES[name.trim().toLowerCase()] ?? null;
}
function getConfigPath() {
  return join(homedir(), ".polish", "config.json");
}
async function loadConfig() {
  try {
    const raw = await readFile(getConfigPath(), "utf8");
    const parsed = JSON.parse(raw);
    const tone = parsed.tone ? parseToneName(parsed.tone) : null;
    const provider = parsed.provider ? parseProviderName(parsed.provider) : null;
    return { tone: tone ?? DEFAULT_TONE, provider: provider ?? void 0 };
  } catch {
    return { tone: DEFAULT_TONE };
  }
}
async function saveConfig(config) {
  const dir = join(homedir(), ".polish");
  await mkdir(dir, { recursive: true });
  await writeFile(getConfigPath(), `${JSON.stringify(config, null, 2)}
`, {
    mode: 384
  });
}
function extractToneFromArgv(argv) {
  let tone = null;
  const rest = [];
  for (const arg of argv) {
    if (isToneFlag(arg)) {
      tone = parseToneFlag(arg) ?? tone;
      continue;
    }
    rest.push(arg);
  }
  return { tone, rest };
}

// src/commands/config.ts
async function configCommand(args) {
  const sub = args[0]?.toLowerCase();
  if (!sub || sub === "show" || sub === "get") {
    const config = await loadConfig();
    console.log(`tone: ${config.tone}`);
    if (config.provider) {
      console.log(`provider: ${config.provider}`);
    }
    console.log(`
Available: ${TONES.join(", ")}`);
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
  const short = {
    friendly: "f",
    official: "o",
    scientific: "s"
  };
  const hint = short[tone] ? `polish -${short[tone]} your text  (or polish -${tone})` : `polish -${tone} your text  (or polish --${tone})`;
  console.log(`Override for one run: ${hint}`);
}
async function resolveTone(cliTone) {
  if (cliTone) return cliTone;
  const config = await loadConfig();
  return config.tone ?? DEFAULT_TONE;
}

// src/auth/codex-login.ts
import { spawn } from "child_process";

// src/auth/codex-bin.ts
import { execFileSync } from "child_process";
import { createRequire } from "module";
import path from "path";
var require2 = createRequire(import.meta.url);
function findCodexInPath() {
  try {
    const cmd = process.platform === "win32" ? "where" : "which";
    const result = execFileSync(cmd, ["codex"], { encoding: "utf8" }).trim();
    return result.split("\n")[0] || null;
  } catch {
    return null;
  }
}
function resolveCodexBin() {
  const systemCodex = findCodexInPath();
  if (systemCodex) return systemCodex;
  try {
    const pkgJson = require2.resolve("@openai/codex/package.json");
    return path.join(path.dirname(pkgJson), "bin", "codex.js");
  } catch {
    throw new Error(
      "Codex CLI not found. Install it with: npm install -g @openai/codex"
    );
  }
}

// src/auth/login-output.ts
var SKIP_ALWAYS = [
  /^npm notice\b/i,
  /^Need to install the following packages:/,
  /^Ok to proceed\?/,
  /^Successfully logged in\.?\s*$/i
];
var SKIP_BROWSER_ONLY = [/On a remote or headless machine\?/i, /device-auth/i];
function createLoginOutputFilter(options) {
  let pending = "";
  const shouldSkip = (line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (SKIP_ALWAYS.some((re) => re.test(trimmed))) return true;
    if (!options.device && SKIP_BROWSER_ONLY.some((re) => re.test(trimmed))) {
      return true;
    }
    return false;
  };
  const write = (chunk, out) => {
    pending += chunk.toString();
    const lines = pending.split("\n");
    pending = lines.pop() ?? "";
    for (const line of lines) {
      if (!shouldSkip(line)) {
        out.write(`${line}
`);
      }
    }
  };
  const flush = (out) => {
    if (pending && !shouldSkip(pending)) {
      out.write(pending);
    }
    pending = "";
  };
  return { write, flush };
}

// src/auth/codex-login.ts
async function runCodexLogin(device = false) {
  const codexBin = resolveCodexBin();
  const args = ["login"];
  if (device) {
    args.push("--device-auth");
  }
  const filter = createLoginOutputFilter({ device });
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [codexBin, ...args], {
      stdio: ["inherit", "pipe", "pipe"],
      env: process.env
    });
    const onData = (chunk, out) => {
      filter.write(chunk, out);
    };
    child.stdout?.on("data", (chunk) => onData(chunk, process.stdout));
    child.stderr?.on("data", (chunk) => onData(chunk, process.stderr));
    child.on("error", reject);
    child.on("close", (code) => {
      filter.flush(process.stdout);
      filter.flush(process.stderr);
      resolve(code ?? 1);
    });
  });
}

// src/auth/claude-login.ts
import { spawn as spawn2 } from "child_process";

// src/auth/claude-bin.ts
import { execFileSync as execFileSync2 } from "child_process";
import { createRequire as createRequire2 } from "module";
import { arch } from "os";
import path2 from "path";
var require3 = createRequire2(import.meta.url);
var PACKAGE_PREFIX = "@anthropic-ai/claude-code";
var PLATFORMS = {
  "darwin-arm64": { pkg: `${PACKAGE_PREFIX}-darwin-arm64`, bin: "claude" },
  "darwin-x64": { pkg: `${PACKAGE_PREFIX}-darwin-x64`, bin: "claude" },
  "linux-x64": { pkg: `${PACKAGE_PREFIX}-linux-x64`, bin: "claude" },
  "linux-arm64": { pkg: `${PACKAGE_PREFIX}-linux-arm64`, bin: "claude" },
  "linux-x64-musl": { pkg: `${PACKAGE_PREFIX}-linux-x64-musl`, bin: "claude" },
  "linux-arm64-musl": { pkg: `${PACKAGE_PREFIX}-linux-arm64-musl`, bin: "claude" },
  "win32-x64": { pkg: `${PACKAGE_PREFIX}-win32-x64`, bin: "claude.exe" },
  "win32-arm64": { pkg: `${PACKAGE_PREFIX}-win32-arm64`, bin: "claude.exe" }
};
function detectMusl() {
  if (process.platform !== "linux") return false;
  const report = typeof process.report?.getReport === "function" ? process.report.getReport() : null;
  return report != null && report.header?.glibcVersionRuntime === void 0;
}
function getPlatformKey() {
  const platform = process.platform;
  const cpu = arch();
  if (platform === "linux" && detectMusl()) {
    return `${platform}-${cpu}-musl`;
  }
  return `${platform}-${cpu}`;
}
function findClaudeInPath() {
  try {
    const cmd = process.platform === "win32" ? "where" : "which";
    const result = execFileSync2(cmd, ["claude"], { encoding: "utf8" }).trim();
    return result.split("\n")[0] || null;
  } catch {
    return null;
  }
}
function resolveClaudeBin() {
  const systemClaude = findClaudeInPath();
  if (systemClaude) return systemClaude;
  const key = getPlatformKey();
  const entry = key ? PLATFORMS[key] : null;
  if (entry) {
    try {
      const pkgJson = require3.resolve(`${entry.pkg}/package.json`);
      return path2.join(path2.dirname(pkgJson), entry.bin);
    } catch {
    }
  }
  throw new Error(
    "Claude CLI not found. Install it with: npm install -g @anthropic-ai/claude-code"
  );
}

// src/auth/claude-login.ts
async function runClaudeLogin() {
  const claudeBin = resolveClaudeBin();
  const filter = createLoginOutputFilter({ device: false });
  return new Promise((resolve, reject) => {
    const child = spawn2(claudeBin, ["auth", "login", "--claudeai"], {
      stdio: ["inherit", "pipe", "pipe"],
      env: process.env
    });
    const onData = (chunk, out) => {
      filter.write(chunk, out);
    };
    child.stdout?.on("data", (chunk) => onData(chunk, process.stdout));
    child.stderr?.on("data", (chunk) => onData(chunk, process.stderr));
    child.on("error", reject);
    child.on("close", (code) => {
      filter.flush(process.stdout);
      filter.flush(process.stderr);
      resolve(code ?? 1);
    });
  });
}

// src/auth/claude-auth.ts
import { execFile } from "child_process";
import { access, readFile as readFile2 } from "fs/promises";
import { homedir as homedir2, userInfo } from "os";
import { join as join2 } from "path";
import { promisify } from "util";
var execFileAsync = promisify(execFile);
var KEYCHAIN_SERVICE = "Claude Code-credentials";
function getClaudeCredentialsPath() {
  const configDir = process.env.CLAUDE_CONFIG_DIR ?? join2(homedir2(), ".claude");
  return join2(configDir, ".credentials.json");
}
async function readClaudeCredentialsFile() {
  try {
    await access(getClaudeCredentialsPath());
    const raw = await readFile2(getClaudeCredentialsPath(), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
async function readClaudeCredentialsFromKeychain() {
  if (process.platform !== "darwin") return null;
  try {
    const account = userInfo().username;
    const { stdout } = await execFileAsync("security", [
      "find-generic-password",
      "-s",
      KEYCHAIN_SERVICE,
      "-a",
      account,
      "-w"
    ]);
    return JSON.parse(stdout.trim());
  } catch {
    try {
      const { stdout } = await execFileAsync("security", [
        "find-generic-password",
        "-s",
        KEYCHAIN_SERVICE,
        "-w"
      ]);
      return JSON.parse(stdout.trim());
    } catch {
      return null;
    }
  }
}
async function readClaudeCredentials() {
  return await readClaudeCredentialsFromKeychain() ?? await readClaudeCredentialsFile();
}
async function hasClaudeAuth() {
  try {
    const claudeBin = resolveClaudeBin();
    const { stdout } = await execFileAsync(claudeBin, ["auth", "status", "--json"]);
    const status = JSON.parse(stdout.trim());
    if (status.loggedIn) return true;
  } catch {
  }
  const token = await getClaudeAccessToken();
  return Boolean(token);
}
async function getClaudeAccessToken() {
  const parsed = await readClaudeCredentials();
  const oauth = parsed?.claudeAiOauth;
  if (!oauth?.accessToken) return null;
  if (oauth.expiresAt && oauth.expiresAt < Date.now()) {
    return null;
  }
  return oauth.accessToken;
}

// src/auth/codex-auth.ts
import { access as access2 } from "fs/promises";
import { homedir as homedir3 } from "os";
import { join as join3 } from "path";
function getCodexAuthPath() {
  const codexHome = process.env.CODEX_HOME ?? join3(homedir3(), ".codex");
  return join3(codexHome, "auth.json");
}
async function hasCodexAuth() {
  try {
    await access2(getCodexAuthPath());
    return true;
  } catch {
    return false;
  }
}

// src/auth/provider-auth.ts
async function hasProviderAuth(provider) {
  switch (provider) {
    case "chatgpt":
      return hasCodexAuth();
    case "claude":
      return hasClaudeAuth();
  }
}
async function resolveActiveProvider() {
  const configured = await loadProvider();
  if (configured && await hasProviderAuth(configured)) {
    return configured;
  }
  if (await hasCodexAuth()) return "chatgpt";
  if (await hasClaudeAuth()) return "claude";
  return configured ?? "chatgpt";
}
async function isLoggedIn() {
  const provider = await resolveActiveProvider();
  return hasProviderAuth(provider);
}

// src/util/select.ts
import * as p from "@clack/prompts";
async function selectProvider() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return null;
  }
  const options = PROVIDERS.map((value) => ({
    value,
    label: PROVIDER_LABELS[value]
  }));
  const selected = await p.select({
    message: "Choose how to sign in",
    options
  });
  if (p.isCancel(selected)) {
    return null;
  }
  return selected;
}

// src/commands/login.ts
async function runProviderLogin(provider, device) {
  switch (provider) {
    case "chatgpt":
      return runCodexLogin(device);
    case "claude":
      if (device) {
        console.error("Claude login requires a browser on this machine. Omit --device.");
        return 1;
      }
      return runClaudeLogin();
  }
}
async function loginCommand(options) {
  let provider = options.provider ?? null;
  if (!provider) {
    provider = await selectProvider();
    if (!provider) {
      console.error(
        "No provider selected. Run interactively, or: polish login chatgpt|claude"
      );
      process.exit(1);
    }
  }
  if (await hasProviderAuth(provider)) {
    console.log(`You're already signed in with ${PROVIDER_LABELS[provider]}.
`);
    console.log("Try: polish hello world");
    return;
  }
  const device = options.device ?? false;
  if (provider === "chatgpt") {
    if (device) {
      console.log("Sign in with ChatGPT (device code)\n");
      console.log("Follow the prompts below.\n");
    } else {
      console.log("Sign in with ChatGPT\n");
      console.log("Opening your browser\u2026");
      console.log("If it doesn't open, use the link below.\n");
    }
  }
  const code = await runProviderLogin(provider, device);
  if (code !== 0) {
    if (provider === "chatgpt" && !device) {
      console.error("\nLogin failed. On a remote machine, try: polish login --device");
    } else {
      console.error("\nLogin failed.");
    }
    process.exit(code);
  }
  const ok = await hasProviderAuth(provider);
  if (!ok) {
    console.error("\nLogin finished but credentials were not saved. Try again.");
    process.exit(1);
  }
  await saveProvider(provider);
  console.log(`
\u2713 Signed in with ${PROVIDER_LABELS[provider]}. Try: polish hello world`);
  if (provider === "chatgpt") {
    console.log("\nNote: Only one device can be signed in at a time.");
    console.log("Signing in here will invalidate any other active session.");
  }
}

// src/auth/codex-logout.ts
import { spawn as spawn3 } from "child_process";
async function runCodexLogout() {
  const codexBin = resolveCodexBin();
  return new Promise((resolve, reject) => {
    const child = spawn3(process.execPath, [codexBin, "logout"], {
      stdio: "inherit",
      env: process.env
    });
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
}

// src/auth/claude-logout.ts
import { spawn as spawn4 } from "child_process";
async function runClaudeLogout() {
  const claudeBin = resolveClaudeBin();
  return new Promise((resolve, reject) => {
    const child = spawn4(claudeBin, ["auth", "logout"], {
      stdio: "inherit",
      env: process.env
    });
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
}

// src/commands/logout.ts
async function logoutCommand() {
  const provider = await resolveActiveProvider();
  if (provider === "chatgpt") {
    if (!await hasCodexAuth()) {
      console.log("You're not signed in.");
      return;
    }
    const code = await runCodexLogout();
    if (code !== 0) process.exit(code);
    if (await hasCodexAuth()) {
      console.error("\nSign-out finished but credentials may still be present.");
      process.exit(1);
    }
  } else if (provider === "claude") {
    if (!await hasClaudeAuth()) {
      console.log("You're not signed in.");
      return;
    }
    const code = await runClaudeLogout();
    if (code !== 0) process.exit(code);
    if (await hasClaudeAuth()) {
      console.error("\nSign-out finished but credentials may still be present.");
      process.exit(1);
    }
  }
  const config = await loadConfig();
  if (config.provider === provider) {
    await saveConfig({ tone: config.tone });
  }
  console.log(`
\u2713 Signed out from ${PROVIDER_LABELS[provider]}.`);
}

// src/commands/polish.ts
import clipboard from "clipboardy";
import { closeSync, openSync, readSync } from "fs";

// src/ai/generate-text.ts
import { generateText as generateText2 } from "ai";
import { createOpenAIOAuth } from "openai-oauth-provider";

// src/ai/generate-claude.ts
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
var PREFERRED_MODELS = [
  "claude-haiku-4-5",
  "claude-haiku-4-5-20251001",
  "claude-sonnet-4-6",
  "claude-sonnet-4-20250514"
];
function formatClaudeError(err) {
  if (err && typeof err === "object" && "errors" in err) {
    const errors = err.errors;
    const last = errors?.[errors.length - 1];
    if (last && typeof last === "object") {
      const api = last;
      const type = api.data?.error?.type;
      const message = api.data?.error?.message;
      if (type || message) {
        return [type, message].filter(Boolean).join(": ");
      }
      if (api.statusCode) return `HTTP ${api.statusCode}`;
    }
  }
  return err instanceof Error ? err.message : String(err);
}
async function generateWithClaude(input, system) {
  const authToken = await getClaudeAccessToken();
  if (!authToken) {
    throw new Error("Not logged in to Claude. Run: polish login");
  }
  const anthropic = createAnthropic({
    authToken,
    headers: {
      "anthropic-beta": "claude-code-20250219,oauth-2025-04-20"
    }
  });
  let lastError;
  let lastMessage = "";
  for (const modelId of PREFERRED_MODELS) {
    try {
      const result = await generateText({
        model: anthropic(modelId),
        system,
        prompt: input,
        maxRetries: 1
      });
      const text = result.text.trim();
      if (text) return text;
    } catch (err) {
      lastError = err;
      lastMessage = formatClaudeError(err);
      if (/model:/i.test(lastMessage)) continue;
    }
  }
  throw new Error(
    lastMessage || "Failed to generate text with any available Claude model.",
    { cause: lastError }
  );
}

// src/ai/generate-text.ts
var PREFERRED_MODELS2 = [
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-5-mini",
  "gpt-5",
  "gpt-5.4",
  "gpt-5.3-codex"
];
async function generateWithSystemPrompt(input, system, provider) {
  const active = provider ?? await resolveActiveProvider();
  if (active === "claude") {
    return generateWithClaude(input, system);
  }
  const openai = createOpenAIOAuth({
    authFilePath: getCodexAuthPath()
  });
  let lastError;
  for (const modelId of PREFERRED_MODELS2) {
    try {
      const result = await generateText2({
        model: openai(modelId),
        system,
        prompt: input
      });
      const text = result.text.trim();
      if (text) return text;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError ?? new Error("Failed to generate text with any available model.");
}

// src/ai/prompt.ts
var TONE_INSTRUCTIONS = {
  friendly: "Use a warm, natural, and approachable tone \u2014 like a thoughtful message to a trusted colleague. Keep it conversational without sounding overly casual.",
  official: "Use a formal and professional tone \u2014 clear, polished, and suitable for business communication, reports, or documentation.",
  scientific: "Use a precise, objective, and technical tone \u2014 concise, evidence-oriented, and appropriate for academic or engineering contexts.",
  political: "Use a diplomatic, measured, and neutral tone \u2014 carefully worded, balanced, and appropriate for sensitive or policy-related communication.",
  poetic: "Use a poetic and artistic tone \u2014 vivid, evocative, and emotionally expressive while preserving the original meaning."
};
var BASE_PROMPT = `
You are an expert writing assistant.

Your task:
- Fix grammar, spelling, punctuation, and awkward phrasing
- Improve clarity, readability, and flow
- Preserve the original meaning and intent
- Keep the writing style and structure natural
- Do not over-rewrite unless necessary

Important rules:
- Preserve contractions and apostrophes (don't, it's, we're, etc.)
- Preserve emojis exactly as written
- Preserve technical terms, code, product names, and formatting
- Do not add new information
- Do not remove important nuance or tone
- Do not mention the author or repository unless it appears in the input
- Return only the polished text
- Do not use quotes
- Do not explain your changes
`.trim();
function buildSystemPrompt(tone) {
  return [BASE_PROMPT, `Tone instruction: ${TONE_INSTRUCTIONS[tone]}`].join(
    "\n\n"
  );
}
var COMMIT_PROMPT = `
You are an expert software engineer writing git commit messages.

Write a clear and concise commit message from the provided diff.

Rules:
- Prefer Conventional Commits when appropriate:
  - feat:
  - fix:
  - refactor:
  - docs:
  - test:
  - chore:
  - ci:
  - build:
  - perf:
  - style:
- Use imperative mood ("add", "fix", "update")
- Keep the subject line under 72 characters
- Do not end the subject line with a period
- Add a short body only when additional context is useful
- Explain *why* when possible, not only *what*
- Be specific and technically accurate
- Avoid vague messages like "update files" or "fix stuff"
- Do not mention the author or repository unless it appears in the diff/context
- Return only the commit message
- Do not use markdown fences or explanations
`.trim();
var PR_PROMPT = `
You are an expert software engineer writing pull request descriptions.

Write a concise and well-structured PR description based on the provided commits and diff.

Format as markdown using these sections:
## Summary
## Changes
## Test Plan

Rules:
- Omit empty sections
- Use bullet points when helpful
- Keep descriptions concise and specific
- Highlight user-visible or architectural changes
- Mention important implementation details when relevant
- Include testing steps or validation if available
- Avoid generic filler text
- Do not mention the author or repository unless it appears in the diff/context
- Return only the PR description
`.trim();
function buildCommitSystemPrompt() {
  return COMMIT_PROMPT;
}
function buildPrSystemPrompt() {
  return PR_PROMPT;
}

// src/ai/polish-text.ts
async function polishText(text, tone) {
  return generateWithSystemPrompt(text, buildSystemPrompt(tone));
}
async function generateCommitMessage(diff) {
  return generateWithSystemPrompt(diff, buildCommitSystemPrompt());
}
async function generatePrDescription(context) {
  return generateWithSystemPrompt(context, buildPrSystemPrompt());
}

// src/util/git-diff.ts
import { execFileSync as execFileSync3 } from "child_process";
var MAX_DIFF_CHARS = 1e5;
function runGit(args) {
  try {
    return execFileSync3("git", args, {
      encoding: "utf8",
      maxBuffer: 12 * 1024 * 1024
    }).trim();
  } catch {
    return "";
  }
}
function truncate(text) {
  if (text.length <= MAX_DIFF_CHARS) return text;
  return `${text.slice(0, MAX_DIFF_CHARS)}

[diff truncated \u2014 ${text.length - MAX_DIFF_CHARS} chars omitted]`;
}
function guessPrBase() {
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
function getStagedDiff() {
  const staged = runGit(["diff", "--staged"]);
  if (staged) return truncate(staged);
  return truncate(runGit(["diff"]));
}
function getPrDiffContext() {
  const base = guessPrBase();
  const diff = truncate(runGit(["diff", `${base}...HEAD`]));
  const log = runGit(["log", "--oneline", `${base}..HEAD`]);
  const branch = runGit(["rev-parse", "--abbrev-ref", "HEAD"]);
  const parts = [`Branch: ${branch || "unknown"}`, `Base: ${base}`];
  if (log) parts.push("", "Commits:", log);
  if (diff) parts.push("", "Diff:", diff);
  return parts.join("\n");
}
function isInsideGitRepo() {
  return runGit(["rev-parse", "--is-inside-work-tree"]) === "true";
}

// src/util/input.ts
import { stdin } from "process";
async function readStdin() {
  const chunks = [];
  for await (const chunk of stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8").trim();
}

// src/util/spinner.ts
var CHASE = [0, 1, 2, 5, 8, 7, 6, 3, 4, -1];
var DIM = "\xB7";
var ON = "\u25CF";
function isInteractiveTerminal() {
  return Boolean(process.stderr.isTTY);
}
function terminalColumns() {
  const cols = process.stderr.columns;
  return cols && cols > 0 ? cols : 80;
}
var SPINNER_VISIBLE_WIDTH = 13;
function buildInlineSquare(active) {
  const cells = Array(9).fill(DIM);
  if (active === -1) {
    for (let i = 0; i < 9; i += 1) cells[i] = ON;
  } else {
    cells[active] = ON;
  }
  return `${cells[0]}${cells[1]}${cells[2]} ${cells[3]}${cells[4]}${cells[5]} ${cells[6]}${cells[7]}${cells[8]}`;
}
function truncateForDisplay(text, max) {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (max < 4) return oneLine.slice(0, max);
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max - 1)}\u2026`;
}
function maxPrefixWidth() {
  return Math.max(16, terminalColumns() - SPINNER_VISIBLE_WIDTH);
}
async function withInlineSpinner(work, inputPreview) {
  if (!isInteractiveTerminal()) {
    process.stderr.write("Polishing\u2026\n");
    return work();
  }
  const prefix = truncateForDisplay(inputPreview, maxPrefixWidth());
  let frame = 0;
  let timer;
  const render = () => {
    const square = buildInlineSquare(CHASE[frame % CHASE.length]);
    frame += 1;
    process.stderr.write(`\r\x1B[2K${prefix}  \x1B[36m${square}\x1B[0m`);
  };
  render();
  timer = setInterval(render, 110);
  try {
    return await work();
  } finally {
    if (timer) clearInterval(timer);
    process.stderr.write("\r\x1B[2K");
  }
}

// src/util/tty.ts
function isStdinPiped() {
  return !process.stdin.isTTY;
}
function isStdoutPiped() {
  return !process.stdout.isTTY;
}

// src/util/terminal-ui.ts
var CYAN = "\x1B[36m";
var MUTED = "\x1B[2;36m";
var GREEN = "\x1B[32m";
var RESET = "\x1B[0m";
function isInteractiveDisplay() {
  return Boolean(process.stdout.isTTY) && !isStdoutPiped();
}
function buildCommandPreview(inlineText, mode) {
  if (mode === "commit") return "polish -c";
  if (mode === "pr") return "polish --pr";
  const trimmed = inlineText.trim();
  if (!trimmed) return "polish";
  const quote = trimmed.includes('"') ? "'" : '"';
  const display = trimmed.length > 72 ? `${trimmed.slice(0, 69)}\u2026` : trimmed;
  return `polish ${quote}${display}${quote}`;
}
function clipboardSuccessLabel(mode, short) {
  if (short) {
    if (mode === "commit") return "commit message copied to clipboard.";
    if (mode === "pr") return "PR description copied to clipboard.";
    return "copied to clipboard.";
  }
  if (mode === "commit") return "Commit message copied to clipboard.";
  if (mode === "pr") return "PR description copied to clipboard.";
  return "Polished text copied to clipboard.";
}
function writeCommandLine(commandPreview) {
  console.log(`${CYAN}$${RESET} ${commandPreview}`);
}
function writeStatusLine(message) {
  console.log(`${MUTED}\u2192 ${message}${RESET}`);
}
function writeResultLine(result) {
  const lines = result.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    if (i === 0) {
      console.log(`${MUTED}\u2192${RESET} ${line}`);
    } else {
      console.log(`  ${line}`);
    }
  }
}
function writeCopiedLine(mode) {
  const label = clipboardSuccessLabel(mode, true);
  console.log(`${GREEN}\u2713 ${label}${RESET}`);
}

// src/util/text-diff.ts
import { diffWordsWithSpace } from "diff";
var RED = "\x1B[31m";
var GREEN2 = "\x1B[32m";
var DIM2 = "\x1B[2m";
var RESET2 = "\x1B[0m";
function formatColoredWordDiff(before, after, color) {
  const parts = diffWordsWithSpace(before, after);
  if (!color) {
    return parts.map((part) => {
      if (part.removed) return `[-${part.value}]`;
      if (part.added) return `[+${part.value}]`;
      return part.value;
    }).join("");
  }
  return parts.map((part) => {
    if (part.removed) return `${RED}${part.value}${RESET2}`;
    if (part.added) return `${GREEN2}${part.value}${RESET2}`;
    return part.value;
  }).join("");
}
function writePolishDiff(before, after, stream) {
  const colored = formatColoredWordDiff(before, after, Boolean(stream.isTTY));
  stream.write(`${DIM2}\u2500\u2500 changes \u2500\u2500${RESET2}
${colored}
`);
}

// src/util/text.ts
var CONTRACTION_FIXES = [
  [/\bdon t\b/gi, "don't"],
  [/\bwon t\b/gi, "won't"],
  [/\bcan t\b/gi, "can't"],
  [/\bisn t\b/gi, "isn't"],
  [/\baren t\b/gi, "aren't"],
  [/\bwasn t\b/gi, "wasn't"],
  [/\bweren t\b/gi, "weren't"],
  [/\bhasn t\b/gi, "hasn't"],
  [/\bhaven t\b/gi, "haven't"],
  [/\bhadn t\b/gi, "hadn't"],
  [/\bwouldn t\b/gi, "wouldn't"],
  [/\bshouldn t\b/gi, "shouldn't"],
  [/\bcouldn t\b/gi, "couldn't"],
  [/\bdoesn t\b/gi, "doesn't"],
  [/\bdidn t\b/gi, "didn't"],
  [/\bit s\b/gi, "it's"],
  [/\bthat s\b/gi, "that's"],
  [/\bwhat s\b/gi, "what's"],
  [/\bwho s\b/gi, "who's"],
  [/\bhere s\b/gi, "here's"],
  [/\bthere s\b/gi, "there's"],
  [/\bwhere s\b/gi, "where's"],
  [/\bwe re\b/gi, "we're"],
  [/\bthey re\b/gi, "they're"],
  [/\byou re\b/gi, "you're"],
  [/\bI m\b/g, "I'm"]
];
function fixContractions(text) {
  let result = text;
  for (const [pattern, replacement] of CONTRACTION_FIXES) {
    result = result.replace(pattern, replacement);
  }
  return result;
}
function collapseExtraNewlines(text) {
  return text.replace(/\n{2,}/g, "\n\n");
}
function normalizeInput(text) {
  const stripped = text.replace(/\r\n/g, "\n").split("\n").map((line) => line.replace(/^quote>\s*/i, "").replace(/^>\s*/, "")).join("\n");
  return fixContractions(collapseExtraNewlines(stripped).trim());
}

// src/commands/polish.ts
async function readClipboard() {
  try {
    return (await clipboard.read()).trim();
  } catch {
    console.error("Could not read from clipboard.");
    process.exit(1);
  }
}
async function readInteractivePaste() {
  const eofHint = process.platform === "win32" ? "Ctrl-Z then Enter" : "Ctrl-D";
  console.log(`Paste your text (supports ', "), then press ${eofHint}:
`);
  if (process.platform === "win32") {
    const { createInterface } = await import("readline");
    const rl = createInterface({ input: process.stdin, terminal: false });
    const lines = [];
    for await (const line of rl) lines.push(line);
    return lines.join("\n").trim();
  }
  const ttyFd = openSync("/dev/tty", "r");
  const chunks = [];
  const buf = Buffer.alloc(4096);
  let n;
  while ((n = readSync(ttyFd, buf, 0, buf.length, null)) > 0) {
    chunks.push(Buffer.from(buf.subarray(0, n)));
  }
  closeSync(ttyFd);
  return Buffer.concat(chunks).toString("utf8").trim();
}
async function resolveInput(text, options) {
  let input = text.trim();
  const stdinPiped = isStdinPiped();
  const fromStdin = options.stdin || stdinPiped;
  if (options.mode === "commit") {
    if (fromStdin && !input) {
      input = await readStdin();
    } else if (!input) {
      if (!isInsideGitRepo()) {
        console.error("Not in a git repo. Pipe a diff: git diff | polish -c");
        process.exit(1);
      }
      input = getStagedDiff();
    }
    if (!input.trim()) {
      console.error("No diff found. Stage changes or pipe one: git diff | polish -c");
      process.exit(1);
    }
    return input;
  }
  if (options.mode === "pr") {
    if (fromStdin && !input) {
      input = await readStdin();
    } else if (!input) {
      if (!isInsideGitRepo()) {
        console.error("Not in a git repo. Pipe a diff: git diff main...HEAD | polish --pr");
        process.exit(1);
      }
      input = getPrDiffContext();
    }
    if (!input.trim()) {
      console.error("No changes found vs base branch. Pipe a diff: git diff | polish --pr");
      process.exit(1);
    }
    return input;
  }
  if (fromStdin && !input) {
    input = await readStdin();
  } else if (!input && !stdinPiped) {
    input = await readClipboard();
    if (!input) {
      input = await readInteractivePaste();
    }
  }
  return normalizeInput(input);
}
function spinnerLabel(mode, input) {
  if (mode === "commit") return "Writing commit message\u2026";
  if (mode === "pr") return "Writing PR description\u2026";
  return input;
}
async function polishCommand(text, options) {
  if (!await isLoggedIn()) {
    console.error("Not logged in. Run: polish login");
    process.exit(1);
  }
  const mode = options.mode ?? "text";
  const inlineArg = text.trim();
  const showDiff = Boolean(options.diff);
  const stdinPiped = isStdinPiped();
  const prosePiped = stdinPiped && mode === "text";
  const interactive = isInteractiveDisplay() && !prosePiped;
  const clipboardUiShown = interactive && mode === "text" && !inlineArg && !options.stdin && !stdinPiped;
  if (showDiff && mode !== "text") {
    console.error("--diff is only supported for normal polish (not -c or --pr).");
    process.exit(1);
  }
  if (clipboardUiShown) {
    writeCommandLine(buildCommandPreview("", mode));
    writeStatusLine("reading clipboard...");
  }
  const input = await resolveInput(text, { stdin: options.stdin, mode });
  if (!input) {
    console.error(
      "No text provided.\n  polish your text here\n  polish              (read from clipboard)\n  cat summary.txt | polish\n  git diff | polish -c\n  polish --pr\n\nFor apostrophes (don't), run once:\n  polish shell-init zsh >> ~/.zshrc && source ~/.zshrc"
    );
    process.exit(1);
  }
  const tone = await resolveTone(options.tone ?? null);
  const stdoutPiped = isStdoutPiped();
  const print = options.print || options.noCopy || stdoutPiped || prosePiped;
  const noCopy = options.noCopy || stdoutPiped || prosePiped;
  try {
    const work = async () => {
      if (mode === "commit") return generateCommitMessage(input);
      if (mode === "pr") return generatePrDescription(input);
      return polishText(input, tone);
    };
    const result = await withInlineSpinner(work, spinnerLabel(mode, input));
    if (interactive) {
      if (!clipboardUiShown) {
        writeCommandLine(buildCommandPreview(inlineArg, mode));
      }
      writeResultLine(result);
    } else if (print) {
      console.log(result);
    }
    if (showDiff) {
      const diffStream = stdoutPiped ? process.stderr : process.stdout;
      writePolishDiff(input, result, diffStream);
    }
    if (noCopy) {
      return;
    }
    try {
      await clipboard.write(result);
      if (interactive) {
        writeCopiedLine(mode);
      } else {
        console.log(clipboardSuccessLabel(mode, false));
      }
    } catch {
      console.error("Could not copy to clipboard. Use -p/--print or -np/--no-copy to see the result.");
      if (!print) {
        console.log(result);
      }
      process.exit(1);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/invalidat|unauthorized|401/i.test(message)) {
      console.error("Session expired. Run: polish logout && polish login");
      process.exit(1);
    }
    const action = mode === "commit" ? "commit message" : mode === "pr" ? "PR description" : "text";
    console.error(`Failed to generate ${action}: ${message}`);
    process.exit(1);
  }
}

// src/commands/shell-init.ts
function shellInitCommand(shell) {
  if (shell !== "zsh") {
    console.error(`Only zsh is supported for now. Requested: ${shell}`);
    console.error("Run: polish shell-init zsh >> ~/.zshrc");
    process.exit(1);
  }
  console.log(`# polish CLI \u2014 pass text with apostrophes (don't, it's) without quoting
# Add once: polish shell-init zsh >> ~/.zshrc && source ~/.zshrc

_polish_preexec() {
  emulate -L zsh
  case "$1" in
    polish|polish\\ -h|polish\\ --help|polish\\ --usage|polish\\ --donate|polish\\ --coffee|polish\\ -V|polish\\ --version|polish\\ login*|polish\\ logout*|polish\\ shell-init*|polish\\ config*)
      unset POLISH_RAW_LINE
      ;;
    polish\\ *)
      typeset -g POLISH_RAW_LINE="\${1#polish }"
      ;;
  esac
}

polish() {
  emulate -L zsh
  if [[ -n "$POLISH_RAW_LINE" ]]; then
    command polish --from-line "$POLISH_RAW_LINE"
    unset POLISH_RAW_LINE
    return $?
  fi
  command polish "$@"
}

autoload -Uz add-zsh-hook
add-zsh-hook preexec _polish_preexec
`);
}

// src/update/check.ts
import * as p2 from "@clack/prompts";

// src/version.ts
function getVersion() {
  return "1.0.0";
}

// src/update/install.ts
import { execFile as execFile2, spawn as spawn5 } from "child_process";
import { promisify as promisify2 } from "util";

// src/update/registry.ts
var NPM_PACKAGE = "@aresgott/polish";
var NPM_REGISTRY_URL = `https://registry.npmjs.org/${encodeURIComponent(NPM_PACKAGE)}/latest`;
var GITHUB_RELEASES_URL = `https://api.github.com/repos/aresgott/polish/releases/latest`;
async function isPublishedOnNpm() {
  try {
    const res = await fetch(NPM_REGISTRY_URL, {
      signal: AbortSignal.timeout(5e3),
      headers: { Accept: "application/json" }
    });
    return res.ok;
  } catch {
    return false;
  }
}
async function fetchLatestVersion() {
  try {
    const npmRes = await fetch(NPM_REGISTRY_URL, {
      signal: AbortSignal.timeout(5e3),
      headers: { Accept: "application/json" }
    });
    if (npmRes.ok) {
      const data = await npmRes.json();
      if (data.version?.trim()) return data.version.trim();
    }
  } catch {
  }
  try {
    const ghRes = await fetch(GITHUB_RELEASES_URL, {
      signal: AbortSignal.timeout(5e3),
      headers: { Accept: "application/vnd.github+json" }
    });
    if (!ghRes.ok) return null;
    const data = await ghRes.json();
    return data.tag_name?.replace(/^v/i, "").trim() || null;
  } catch {
    return null;
  }
}
function isNewerVersion(latest, current) {
  const parse = (v) => v.replace(/^v/i, "").split(".").map((part) => parseInt(part.replace(/[^0-9].*$/, ""), 10) || 0);
  const l = parse(latest);
  const c = parse(current);
  for (let i = 0; i < Math.max(l.length, c.length); i++) {
    const lv = l[i] ?? 0;
    const cv = c[i] ?? 0;
    if (lv > cv) return true;
    if (lv < cv) return false;
  }
  return false;
}

// src/update/install.ts
var execFileAsync2 = promisify2(execFile2);
async function detectInstallMethod() {
  const entry = process.argv[1] ?? "";
  if (entry.includes("/Cellar/polish/") || entry.includes("homebrew")) {
    return "homebrew";
  }
  try {
    await execFileAsync2("brew", ["--prefix", "polish"]);
    return "homebrew";
  } catch {
    return "npm";
  }
}
async function resolveNpmInstallSpec() {
  return await isPublishedOnNpm() ? "@aresgott/polish@latest" : "github:aresgott/polish";
}
async function runUpdateInstall(method) {
  const isWin = process.platform === "win32";
  if (method === "homebrew") {
    return new Promise((resolve, reject) => {
      console.log("Updating via Homebrew\u2026\n");
      const child = spawn5("brew", ["upgrade", "polish"], {
        stdio: "inherit",
        env: process.env
      });
      child.on("error", reject);
      child.on("close", (code) => resolve(code ?? 1));
    });
  }
  const spec = await resolveNpmInstallSpec();
  return new Promise((resolve, reject) => {
    console.log("Updating via npm\u2026\n");
    const child = spawn5("npm", ["install", "-g", spec], {
      stdio: "inherit",
      env: process.env,
      shell: isWin
    });
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
}
function manualUpdateHint(method) {
  if (method === "homebrew") {
    return "Update manually: brew update && brew upgrade polish";
  }
  return "Update manually: npm install -g @aresgott/polish@latest";
}

// src/update/state.ts
import { mkdir as mkdir2, readFile as readFile3, writeFile as writeFile2 } from "fs/promises";
import { homedir as homedir4 } from "os";
import { join as join4 } from "path";
var CHECK_INTERVAL_MS = 3 * 24 * 60 * 60 * 1e3;
function getUpdateStatePath() {
  return join4(homedir4(), ".polish", "update-check.json");
}
async function loadUpdateState() {
  try {
    const raw = await readFile3(getUpdateStatePath(), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
async function saveUpdateState(state) {
  const path3 = getUpdateStatePath();
  await mkdir2(join4(homedir4(), ".polish"), { recursive: true });
  await writeFile2(path3, `${JSON.stringify(state, null, 2)}
`, { mode: 384 });
}
function isCheckDue(state, now = Date.now()) {
  if (!state?.lastCheckedAt) return true;
  return now - state.lastCheckedAt >= CHECK_INTERVAL_MS;
}

// src/update/check.ts
function shouldSkipUpdateCheck() {
  if (process.env.POLISH_SKIP_UPDATE_CHECK === "1") return true;
  if (!process.stdin.isTTY || !process.stdout.isTTY) return true;
  return false;
}
async function maybeCheckForUpdate(options) {
  if (!options?.force && shouldSkipUpdateCheck()) return;
  const current = getVersion();
  const state = await loadUpdateState();
  if (!options?.force && !isCheckDue(state)) return;
  const latest = await fetchLatestVersion();
  const now = Date.now();
  if (!latest) {
    await saveUpdateState({
      lastCheckedAt: now,
      skippedVersion: state?.skippedVersion
    });
    return;
  }
  if (!isNewerVersion(latest, current)) {
    await saveUpdateState({
      lastCheckedAt: now,
      skippedVersion: void 0
    });
    if (options?.force) {
      console.log(`polish is up to date (${current}).`);
    }
    return;
  }
  if (!options?.force && state?.skippedVersion === latest) {
    await saveUpdateState({ lastCheckedAt: now, skippedVersion: latest });
    return;
  }
  if (shouldSkipUpdateCheck()) {
    if (options?.force) {
      const method = await detectInstallMethod();
      console.log(`Update available: ${current} \u2192 ${latest}`);
      console.log(manualUpdateHint(method));
    }
    return;
  }
  console.log(`
A new version of polish is available: ${current} \u2192 ${latest}`);
  const install = await p2.confirm({
    message: "Install update now? (Y/n)",
    initialValue: true
  });
  if (p2.isCancel(install) || !install) {
    await saveUpdateState({ lastCheckedAt: now, skippedVersion: latest });
    const method = await detectInstallMethod();
    console.log(`Skipped ${latest}. ${manualUpdateHint(method)}
`);
    return;
  }
  await runInstall(latest, state?.skippedVersion);
}
async function runInstall(latest, previousSkipped) {
  const method = await detectInstallMethod();
  const code = await runUpdateInstall(method);
  if (code === 0) {
    await saveUpdateState({ lastCheckedAt: Date.now(), skippedVersion: void 0 });
    console.log(`
\u2713 Updated to ${latest}.`);
    return;
  }
  await saveUpdateState({
    lastCheckedAt: Date.now(),
    skippedVersion: previousSkipped
  });
  console.error(`
Update failed. ${manualUpdateHint(method)}`);
  process.exit(code);
}

// src/commands/update.ts
async function updateCommand() {
  await maybeCheckForUpdate({ force: true });
}

// src/help.ts
var DONATE_URL = "https://buymeacoffee.com/aresgott";
var COL = 30;
function row(command, description) {
  if (!command) return `  ${" ".repeat(COL)}${description}`;
  if (command.length >= COL) {
    return `  ${command}
  ${" ".repeat(COL)}${description}`;
  }
  return `  ${command.padEnd(COL)}${description}`;
}
function showDonate() {
  console.log(`Support Polish: ${DONATE_URL}`);
}
function showUsage() {
  const toneRows = TONE_REFERENCE.map(
    (t) => row(`${t.tone.padEnd(12)} ${t.short}  ${t.long}`, t.description)
  ).join("\n");
  console.log(`polish \u2014 Polish text with ChatGPT or Claude (grammar, tone, clipboard)

USAGE
${row("polish [options] [text ...]", "Polish inline text")}
${row("polish [options]", "Read from clipboard, or stdin when piped")}
${row("polish <command>", "login, logout, config, update, shell-init")}

COMMANDS
${row("login", "Sign in (arrow menu: ChatGPT or Claude)")}
${row("login chatgpt|claude", "Sign in with a specific provider")}
${row("login --device", "Device / headless login (ChatGPT only)")}
${row("logout", "Sign out from the active provider")}
${row("update", "Check for updates and install (also runs every 3 days)")}
${row("config", "Show saved default tone")}
${row("config <tone>", "Set default tone (~/.polish/config.json)")}
${row("config set <tone>", "Same as polish config <tone>")}
${row("shell-init zsh", "Install zsh hook for apostrophes (don't, it's)")}

OPTIONS
${row("-f, -o, -s", "Short tone override (friendly, official, scientific)")}
${row("-friendly, -poetic, \u2026", "Long tone override (see tones below)")}
${row("-scientifical", "Alias for scientific")}
${row("-c, --commit", "Write a commit message from a git diff")}
${row("--pr", "Write a PR description from branch diff")}
${row("-p, --print", "Print result to terminal (still copies to clipboard)")}
${row("--diff", "Show word-level diff (red removed, green added); text mode only")}
${row("-np, --np, --no-copy", "Do not copy to clipboard (prints result)")}
${row("-, --stdin", "Read text from stdin")}

HELP
${row("-h, --help, --usage", "Show this help")}
${row("-V, --version", "Show version")}
${row("--donate, --coffee", "Support link (Buy Me a Coffee)")}

TONES (default: friendly)
${row("polish config <tone>", "Save a default tone")}
${row("polish -f \u2026 / -friendly \u2026", "Override tone for one run")}

${toneRows}

INPUT
${row("polish hello world", "Inline text")}
${row("polish", "Clipboard; paste at prompt if empty")}
${row("cat file.txt | polish", "Pipe text in (prints to stdout)")}
${row("git diff | polish -c", "Commit message (same -p/-np as polish)")}
${row("polish --pr", "PR description from branch vs base")}
${row("pbpaste | polish", "Pipe from clipboard")}
${row("polish - < file.txt", "Read from file")}

EXAMPLES
  polish login
  polish config official
  polish -f thanks for the quick update
  polish -friendly hey team this looks gr8
  polish --print -o please review the attached document
  polish -np -f thanks for the quick update
  polish -p -o please review the attached document
  polish --diff fix this sentance please
  polish --diff -p hello world
  git diff --staged | polish -c
  git diff --staged | polish -c -p
  polish -c -np
  git diff --staged | polish -c | git commit -F -
  polish --pr
  polish --pr -p

APOSTROPHES (don't, it's)
  The shell breaks on unquoted '. Run once:
    polish shell-init zsh >> ~/.zshrc && source ~/.zshrc
  Then: polish I don't know the ownership...
  Or:   copy text \u2192 polish (no args)

NOTES
  \u2022 Piped prose (cat file | polish) prints only; -c/--pr use the same -p/-np rules with or without a pipe
  \u2022 Emojis in input are preserved in the output
  \u2022 Auth: ChatGPT ~/.codex/auth.json \xB7 Claude ~/.claude/.credentials.json
  \u2022 Config: ~/.polish/config.json (tone, provider)
  \u2022 Updates: checked every 3 days; skip a version with N, or run polish update anytime
  \u2022 Disable auto-check: POLISH_SKIP_UPDATE_CHECK=1
`);
}

// src/util/mode-flags.ts
var COMMIT_FLAGS = /* @__PURE__ */ new Set(["--commit", "-c"]);
var PR_FLAGS = /* @__PURE__ */ new Set(["--pr"]);
function parseMode(argv) {
  if (argv.some((arg) => COMMIT_FLAGS.has(arg))) return "commit";
  if (argv.some((arg) => PR_FLAGS.has(arg))) return "pr";
  return "text";
}
function isModeFlag(arg) {
  return COMMIT_FLAGS.has(arg) || PR_FLAGS.has(arg);
}
var MODE_FLAG_ARGS = [...COMMIT_FLAGS, ...PR_FLAGS];

// src/util/output-flags.ts
var PRINT_FLAGS = /* @__PURE__ */ new Set(["--print", "-p"]);
var NO_COPY_FLAGS = /* @__PURE__ */ new Set(["--no-copy", "--np", "-np"]);
var DIFF_FLAGS = /* @__PURE__ */ new Set(["--diff"]);
function hasPrintFlag(argv) {
  return argv.some((arg) => PRINT_FLAGS.has(arg));
}
function hasNoCopyFlag(argv) {
  return argv.some((arg) => NO_COPY_FLAGS.has(arg));
}
function hasDiffFlag(argv) {
  return argv.some((arg) => DIFF_FLAGS.has(arg));
}
function isOutputFlag(arg) {
  return PRINT_FLAGS.has(arg) || NO_COPY_FLAGS.has(arg) || DIFF_FLAGS.has(arg);
}

// src/util/line-parse.ts
function parsePolishLine(line) {
  let rest = line.trim();
  if (rest.startsWith("polish ")) {
    rest = rest.slice("polish ".length);
  } else if (rest === "polish") {
    return { text: "", print: false, noCopy: false, diff: false, mode: "text" };
  }
  const parts = rest.split(/\s+/).filter(Boolean);
  const print = parts.some((part) => part === "--print" || part === "-p");
  const noCopy = parts.some(
    (part) => part === "--no-copy" || part === "--np" || part === "-np"
  );
  const diff = parts.some((part) => part === "--diff");
  const mode = parseMode(parts);
  const textParts = parts.filter(
    (part) => !isToneFlag(part) && !isOutputFlag(part) && !isModeFlag(part)
  );
  return { text: textParts.join(" "), print, noCopy, diff, mode };
}

// src/util/argv.ts
var FLAGS = /* @__PURE__ */ new Set([
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
  "--from-line"
]);
function wantsHelp(argv) {
  return argv.includes("-h") || argv.includes("--help") || argv.includes("--usage");
}
function wantsDonate(argv) {
  return argv.includes("--donate") || argv.includes("--coffee");
}
var SUBCOMMANDS = /* @__PURE__ */ new Set(["login", "logout", "shell-init", "config", "update"]);
function parseArgv(argv = process.argv.slice(2)) {
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
    const rest2 = argv.slice(1);
    let provider = null;
    for (const arg of rest2) {
      if (arg === "--device") continue;
      const parsed = parseProviderName(arg);
      if (parsed) provider = parsed;
    }
    return {
      command: "login",
      device: rest2.includes("--device"),
      provider
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
    const { tone: tone2 } = extractToneFromArgv(argv);
    return {
      command: "polish",
      text: parsed.text,
      print: parsed.print,
      noCopy: parsed.noCopy,
      diff: parsed.diff,
      stdin: false,
      mode: parsed.mode,
      tone: tone2
    };
  }
  const print = hasPrintFlag(argv);
  const noCopy = hasNoCopyFlag(argv);
  const diff = hasDiffFlag(argv);
  const stdin2 = argv.includes("-") || argv.includes("--stdin");
  const mode = parseMode(argv);
  const { tone, rest } = extractToneFromArgv(argv);
  const text = rest.filter(
    (arg) => !FLAGS.has(arg) && !SUBCOMMANDS.has(arg) && !isOutputFlag(arg) && !isModeFlag(arg) && !isToneFlag(arg)
  ).join(" ").trim();
  return { command: "polish", text, print, noCopy, diff, stdin: stdin2, mode, tone };
}

// src/cli.ts
var SKIP_UPDATE_CHECK = /* @__PURE__ */ new Set([
  "help",
  "donate",
  "version",
  "shell-init",
  "update"
]);
async function main() {
  const parsed = parseArgv();
  if (!SKIP_UPDATE_CHECK.has(parsed.command)) {
    await maybeCheckForUpdate();
  }
  switch (parsed.command) {
    case "help":
      showUsage();
      break;
    case "donate":
      showDonate();
      break;
    case "version":
      console.log(getVersion());
      break;
    case "update":
      await updateCommand();
      break;
    case "login":
      await loginCommand({ device: parsed.device, provider: parsed.provider });
      break;
    case "logout":
      await logoutCommand();
      break;
    case "shell-init":
      shellInitCommand(parsed.shell);
      break;
    case "config":
      await configCommand(parsed.args);
      break;
    case "polish":
      await polishCommand(parsed.text, {
        print: parsed.print,
        noCopy: parsed.noCopy,
        diff: parsed.diff,
        stdin: parsed.stdin,
        mode: parsed.mode,
        tone: parsed.tone
      });
      break;
  }
}
main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
