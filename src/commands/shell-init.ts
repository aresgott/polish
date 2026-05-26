export function shellInitCommand(shell: string): void {
  if (shell !== "zsh") {
    console.error(`Only zsh is supported for now. Requested: ${shell}`);
    console.error("Run: polish shell-init zsh >> ~/.zshrc");
    process.exit(1);
  }

  console.log(`# polish CLI — pass text with apostrophes (don't, it's) without quoting
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
  if [[ -n "\$POLISH_RAW_LINE" ]]; then
    command polish --from-line "\$POLISH_RAW_LINE"
    unset POLISH_RAW_LINE
    return \$?
  fi
  command polish "\$@"
}

autoload -Uz add-zsh-hook
add-zsh-hook preexec _polish_preexec
`);
}
