# Linux installer

One-line install:

```bash
curl -fsSL https://raw.githubusercontent.com/aresgott/polish/main/packaging/linux/install.sh | bash
```

The legacy URL `scripts/install.sh` still works (it forwards to this script).

The installer:

1. Ensures Node.js 20+ (apt, Homebrew, or nvm)
2. Removes the unrelated `polish-cli` npm package if present (name collision)
3. Installs `@aresgott/polish` from npm (GitHub fallback if unpublished)
4. Adds `polish` to your PATH (symlink in `/usr/local/bin` when possible, otherwise `~/.profile` / `~/.bashrc`)
5. Installs `xclip` on Debian/Ubuntu when no clipboard utility is found

Manual install:

```bash
npm install -g @aresgott/polish
sudo apt-get install xclip   # optional, for clipboard support
```
