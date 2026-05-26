#!/usr/bin/env bash
# Bump version field in the Scoop manifest.
set -euo pipefail

version="${1:-}"
manifest="${2:-}"

if [[ -z "$version" ]]; then
  echo "Usage: $0 <version> [manifest-path]" >&2
  exit 1
fi

version="${version#v}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
manifest="${manifest:-${script_dir}/polish.json}"

if [[ ! -f "$manifest" ]]; then
  echo "Manifest not found: $manifest" >&2
  exit 1
fi

sed -i.bak "s/\"version\": \".*\"/\"version\": \"${version}\"/" "$manifest"
rm -f "${manifest}.bak"

echo "Updated ${manifest} to ${version}"
