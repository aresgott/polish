#!/usr/bin/env bash
# Backward-compatible entry point — see packaging/homebrew/sha256.sh
set -euo pipefail
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../packaging/homebrew/sha256.sh" "$@"
