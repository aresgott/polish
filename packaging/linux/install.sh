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

npm_global_bin() {
  local prefix
  prefix=$(npm prefix -g 2>/dev/null) || return 1
  printf '%s/bin' "${prefix}"
}

link_polish_to_system_bin() {
  local src="$1"
  local dir

  for dir in /usr/local/bin /usr/bin; do
    [ -d "$dir" ] || continue
    if [ -w "$dir" ]; then
      ln -sf "$src" "${dir}/${BIN}"
    elif command -v sudo &>/dev/null; then
      sudo ln -sf "$src" "${dir}/${BIN}" 2>/dev/null || continue
    else
      continue
    fi
    info "Linked ${BIN} to ${dir}/${BIN}"
    return 0
  done
  return 1
}

ensure_shell_path() {
  local global_bin="$1"
  local line="export PATH=\"${global_bin}:\$PATH\""
  local file marker="# polish: npm global bin"

  for file in "$HOME/.profile" "$HOME/.bashrc" "$HOME/.zshrc"; do
    [ -e "$file" ] || touch "$file"
    if grep -Fq "$marker" "$file" 2>/dev/null || grep -Fq "$global_bin" "$file" 2>/dev/null; then
      continue
    fi
    {
      printf '\n%s\n%s\n' "$marker" "$line"
    } >>"$file"
    info "Added npm global bin to ${file}"
  done
}

ensure_polish_on_path() {
  local global_bin polish_bin

  global_bin=$(npm_global_bin) || return 1
  polish_bin="${global_bin}/${BIN}"
  [ -x "$polish_bin" ] || return 1

  if command -v "${BIN}" &>/dev/null; then
    return 0
  fi

  case ":${PATH}:" in
    *":${global_bin}:"*) ;;
    *) export PATH="${global_bin}:${PATH}" ;;
  esac
  command -v "${BIN}" &>/dev/null && return 0

  link_polish_to_system_bin "$polish_bin" && command -v "${BIN}" &>/dev/null && return 0

  ensure_shell_path "$global_bin"
  export PATH="${global_bin}:${PATH}"
  command -v "${BIN}" &>/dev/null
}

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

  local global_bin
  global_bin=$(npm_global_bin) || true

  if ensure_polish_on_path; then
    printf "\n${GREEN}${BOLD}Done!${NC} Run:\n\n"
    printf "  ${BOLD}polish login${NC}   — sign in with ChatGPT or Claude\n"
    printf "  ${BOLD}polish --help${NC}  — full reference\n\n"
  elif [ -n "${global_bin}" ] && [ -x "${global_bin}/${BIN}" ]; then
    warn "'${BIN}' is installed at ${global_bin}/${BIN} but could not be added to PATH automatically."
    warn "Run: export PATH=\"${global_bin}:\$PATH\""
  else
    warn "'${BIN}' install finished but the command was not found."
    if [ -n "${global_bin}" ]; then
      warn "Expected binary: ${global_bin}/${BIN}"
      warn "Check: ls -la ${global_bin}/${BIN}"
    fi
    warn "Try: npm install -g ${PACKAGE}"
  fi
}

main "$@"
