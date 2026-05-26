#!/usr/bin/env bash
# Print sha256 for a GitHub release tarball (verify before updating homebrew-polish).
set -euo pipefail

version="${1:-}"
if [[ -z "$version" ]]; then
  echo "Usage: $0 <version>   e.g. $0 1.0.0" >&2
  exit 1
fi

version="${version#v}"
url="https://github.com/aresgott/polish/archive/refs/tags/v${version}.tar.gz"
echo "URL:  $url"
echo -n "sha256: "
curl -fsSL "$url" | shasum -a 256 | awk '{print $1}'
