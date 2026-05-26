import { TONE_REFERENCE } from "./config/tone.js";

export const DONATE_URL = "https://buymeacoffee.com/aresgott";

const COL = 30;

function row(command: string, description: string): string {
  if (!command) return `  ${" ".repeat(COL)}${description}`;
  if (command.length >= COL) {
    return `  ${command}\n  ${" ".repeat(COL)}${description}`;
  }
  return `  ${command.padEnd(COL)}${description}`;
}

export function showDonate(): void {
  console.log(`Support Polish: ${DONATE_URL}`);
}

export function showUsage(): void {
  const toneRows = TONE_REFERENCE.map((t) =>
    row(`${t.tone.padEnd(12)} ${t.short}  ${t.long}`, t.description),
  ).join("\n");

  console.log(`polish — Polish text with ChatGPT or Claude (grammar, tone, clipboard)

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
${row("-friendly, -poetic, …", "Long tone override (see tones below)")}
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
${row("polish -f … / -friendly …", "Override tone for one run")}

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
  Or:   copy text → polish (no args)

NOTES
  • Piped prose (cat file | polish) prints only; -c/--pr use the same -p/-np rules with or without a pipe
  • Emojis in input are preserved in the output
  • Auth: ChatGPT ~/.codex/auth.json · Claude ~/.claude/.credentials.json
  • Config: ~/.polish/config.json (tone, provider)
  • Updates: checked every 3 days; skip a version with N, or run polish update anytime
  • Disable auto-check: POLISH_SKIP_UPDATE_CHECK=1
`);
}
