<p align="center">
  <img
    src="logo.png"
    alt="Polish CLI logo"
    width="160"
    style="display: block; margin: 0 auto; border-radius: 16px;"
  />
</p>

<h1 align="center">Polish</h1>

<p align="center">
  A small CLI that fixes grammar, adjusts tone, and writes for you — powered by ChatGPT or Claude.
</p>

<p align="center">
  <strong>Copy to clipboard</strong> · <strong>pipe-friendly</strong> · <strong>commit messages</strong> · <strong>PR descriptions</strong>
</p>

---

## What it does

- **Polish prose** — fix spelling + grammar, keep your meaning
- **Pick a tone** — friendly (default), official, scientific, poetic
- **Clipboard + pipes** — works interactively or in scripts
- **Git helpers** — generate commit messages and PR descriptions from diffs

## Quick start

```bash
# macOS
brew tap aresgott/polish && brew install polish

# Linux
curl -fsSL https://raw.githubusercontent.com/aresgott/polish/main/packaging/linux/install.sh | bash

# Windows (PowerShell)
scoop install nodejs && scoop install https://raw.githubusercontent.com/aresgott/polish/main/packaging/scoop/polish.json

polish login                 # sign in with ChatGPT or Claude (opens browser)
polish thanks for the quik update
# → polished text on your clipboard

polish --help                # full CLI reference
```

## Install

### macOS

**Homebrew (recommended)** — no Node.js setup required:

```bash
brew tap aresgott/polish
brew install polish
```

Upgrade: `brew update && brew upgrade polish`

**npm (alternative):**

```bash
npm install -g @aresgott/polish
```

### Linux

```bash
curl -fsSL https://raw.githubusercontent.com/aresgott/polish/main/packaging/linux/install.sh | bash
```

The script installs Node.js (apt/Homebrew/nvm), installs `@aresgott/polish`, and tries to install a clipboard utility (`xclip`) if none is present.

> The legacy URL `scripts/install.sh` still works.

**Manual (npm):**

```bash
npm install -g @aresgott/polish   # requires Node.js 20+
```

> **Linux clipboard:** install `xclip` (X11) or `wl-clipboard` (Wayland), or use `-np` to print instead of copying.

### Windows

**Scoop** (recommended — no Node.js setup required):

```powershell
scoop install nodejs
scoop install https://raw.githubusercontent.com/aresgott/polish/main/packaging/scoop/polish.json
```

> The legacy URL `scoop/polish.json` is kept in sync for existing installs.

**Or with npm** (requires [Node.js 20+](https://nodejs.org/en/download)):

```powershell
npm install -g @aresgott/polish
```

> **Windows note:** quote text with apostrophes: `polish "I don't know"`.

### From source

```bash
git clone https://github.com/aresgott/polish.git
cd polish
npm install
npm run build
npm link
```

## Authentication

Polish signs in through your existing **ChatGPT** or **Claude** subscription — no API key needed.

```bash
polish login                 # interactive menu — pick ChatGPT or Claude
polish login chatgpt         # sign in with ChatGPT (browser)
polish login claude          # sign in with Claude (browser)
polish login --device        # device-code login for ChatGPT (SSH / headless)
polish logout                # sign out
```

Credentials are stored in `~/.codex/auth.json` (ChatGPT) or `~/.claude/.credentials.json` (Claude).

## Usage

### Common examples

```bash
polish fix this sentance please
polish -o please review the attached doc     # official tone
echo "rough draft" | polish -np              # pipes: print to stdout
git diff --staged | polish -c -np            # commit message from diff
polish --pr -p                               # PR description (markdown)
```

### Flags you’ll use most

```bash
polish -p hello world          # print + copy
polish -np hello world         # print only (no clipboard)
polish --diff fix this sentance # show a word-diff (text mode)
polish config official         # set default tone
polish update                  # check/install updates
```

## zsh and apostrophes

Unquoted `'` breaks the shell. Install the hook once:

```bash
polish shell-init zsh >> ~/.zshrc
source ~/.zshrc
```

Then:

```bash
polish I don't know the ownership yet but it's fine
```

## Troubleshooting

```bash
# wrong npm package installed (name collision)
npm uninstall -g polish-cli
npm install -g @aresgott/polish
```

- **Not logged in**: run `polish login`
- **Headless/SSH clipboard**: use `-np` (print) or pipe output
- **Linux clipboard**: install `xclip` or `wl-clipboard`
- **ChatGPT browser login fails**: `polish login --device`

## Release maintainer

See [`packaging/README.md`](packaging/README.md) for Homebrew/Scoop/Linux release notes and CI secrets.

## Support

If Polish saves you time, you can [buy me a coffee](https://buymeacoffee.com/aresgott).

```bash
polish --donate    # or: polish --coffee
```

## Legal

For personal use on machines you trust. Follow [OpenAI’s Terms](https://openai.com/policies/terms-of-use) and [Anthropic’s Terms](https://www.anthropic.com/legal/consumer-terms). Not affiliated with OpenAI or Anthropic.

---

<p align="center">
  <a href="https://buymeacoffee.com/aresgott">Buy me a coffee</a>
</p>

<p align="center">
  <img src="logo.png" alt="Polish" width="72" style="display: block; margin: 0 auto; border-radius: 12px;" />
</p>
