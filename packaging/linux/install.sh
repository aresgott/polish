#!/usr/bin/env bash
set -euo pipefail

PACKAGE="@aresgott/polish"
WRONG_PACKAGE="polish-cli"
BIN="polish"
MIN_NODE=20

# ── colours ────────────────────────────────────────────────────────────────────
if [ -t 1 ]; then
  GREEN='\033[0;32m' YELLOW='\033[1;33m' RED='\033[0;31m' BOLD='\033[1m' NC='\033[0m'
else
  GREEN='' YELLOW='' RED='' BOLD='' NC=''
fi

info()  { printf "${GREEN}✓${NC} %s\n" "$*"; }
warn()  { printf "${YELLOW}!${NC} %s\n" "$*"; }
error() { printf "${RED}✗${NC} %s\n" "$*" >&2; exit 1; }
step()  { printf "\n${BOLD}%s${NC}\n" "$*"; }

# ── helpers ────────────────────────────────────────────────────────────────────
node_major() {
  command -v node &>/dev/null || { echo 0; return; }
  node -e 'process.stdout.write(process.versions.node.split(".")[0])' 2>/dev/null || echo 0
}

need_node() { [ "$(node_major)" -lt "$MIN_NODE" ]; }

install_node_nvm() {
  local nvm_dir="${NVM_DIR:-$HOME/.nvm}"
  if [ ! -f "$nvm_dir/nvm.sh" ]; then
    step "Installing nvm…"
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  fi
  export NVM_DIR="$nvm_dir"
  # shellcheck source=/dev/null
  source "$NVM_DIR/nvm.sh"
  step "Installing Node.js ${MIN_NODE}…"
  nvm install "$MIN_NODE" --lts --no-progress >/dev/null
  nvm use "$MIN_NODE" >/dev/null
  nvm alias default "$MIN_NODE" >/dev/null
}

install_clipboard_linux() {
  if [ "$(uname -s)" != "Linux" ]; then
    return 0
  fi

  if command -v xclip &>/dev/null || command -v xsel &>/dev/null || command -v wl-copy &>/dev/null; then
    return 0
  fi

  if command -v apt-get &>/dev/null; then
    step "Installing clipboard utility (xclip)…"
    sudo apt-get install -y xclip >/dev/null 2>&1 \
      || warn "Could not install xclip. Install manually: sudo apt-get install xclip"
    return 0
  fi

  warn "No clipboard utility found. Install one for clipboard support:"
  warn "  apt:     sudo apt-get install xclip"
  warn "  dnf:     sudo dnf install xclip"
  warn "  pacman:  sudo pacman -S xclip"
  warn "  Wayland: sudo apt-get install wl-clipboard"
}

install_polish() {
  if npm list -g "${WRONG_PACKAGE}" --depth=0 &>/dev/null; then
    warn "Removing unrelated npm package ${WRONG_PACKAGE} (name collision)…"
    npm uninstall -g "${WRONG_PACKAGE}" --quiet 2>/dev/null || true
  fi

  step "Installing ${PACKAGE}…"

  # A previous failed install can leave the @aresgott scope entry corrupt.
  local npm_global
  npm_global=$(npm root -g 2>/dev/null) || true
  if [ -n "${npm_global}" ]; then
    npm uninstall -g "${PACKAGE}" 2>/dev/null || true
    local scope_dir="${npm_global}/@aresgott"
    if [ -e "${scope_dir}" ] && [ ! -d "${scope_dir}" ]; then
      rm -f "${scope_dir}"
    fi
    rm -rf "${scope_dir}/polish" 2>/dev/null || true
  fi

  if npm view "${PACKAGE}" version &>/dev/null; then
    npm install -g "${PACKAGE}" --quiet
  else
    warn "${PACKAGE} not on npm yet; installing from GitHub…"
    npm install -g "github:aresgott/polish" --quiet
  fi
}

# ── main ───────────────────────────────────────────────────────────────────────
main() {
  step "Polish installer (Linux)"

  if need_node; then
    warn "Node.js ${MIN_NODE}+ not found."
    if command -v apt-get &>/dev/null; then
      step "Installing Node.js ${MIN_NODE} via apt…"
      curl -fsSL "https://deb.nodesource.com/setup_${MIN_NODE}.x" | sudo -E bash - >/dev/null
      sudo apt-get install -y nodejs >/dev/null
    elif command -v brew &>/dev/null; then
      step "Installing Node.js via Homebrew…"
      brew install "node@${MIN_NODE}" >/dev/null
    else
      install_node_nvm
    fi
  fi

  if need_node; then
    error "Node.js ${MIN_NODE}+ is required. Install it from https://nodejs.org and re-run."
  fi

  info "Node.js $(node --version) found."
  install_polish
  install_clipboard_linux

  if command -v "${BIN}" &>/dev/null; then
    printf "\n${GREEN}${BOLD}Done!${NC} Run:\n\n"
    printf "  ${BOLD}polish login${NC}   — sign in with ChatGPT or Claude\n"
    printf "  ${BOLD}polish --help${NC}  — full reference\n\n"
  else
    warn "'${BIN}' installed but not found in PATH."
    warn "Open a new terminal or add npm's global bin to PATH:"
    warn "  export PATH=\"\$(npm bin -g):\$PATH\""
  fi
}

main "$@"
