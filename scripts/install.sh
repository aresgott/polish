#!/usr/bin/env bash
# Backward-compatible entry point — see packaging/linux/install.sh
set -euo pipefail
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../packaging/linux/install.sh" "$@"
