#!/usr/bin/env bash
# Backward-compatible entry point — see packaging/homebrew/update-formula.sh
set -euo pipefail
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../packaging/homebrew/update-formula.sh" "$@"
