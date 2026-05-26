#!/usr/bin/env bash
# Update Formula/polish.rb url, sha256, and test version for a release tag.
#
# Usage:
#   FORMULA_PATH=path/to/Formula/polish.rb ./update-formula.sh 1.0.0
#
# Defaults:
#   FORMULA_PATH=Formula/polish.rb
#   TEMPLATE=packaging/homebrew/polish.rb.template (relative to polish repo root)
set -euo pipefail

version="${1:-}"
if [[ -z "$version" ]]; then
  echo "Usage: $0 <version>   e.g. $0 1.0.0" >&2
  echo "Optional: FORMULA_PATH=path/to/Formula/polish.rb" >&2
  exit 1
fi

version="${version#v}"
formula="${FORMULA_PATH:-Formula/polish.rb}"
url="https://github.com/aresgott/polish/archive/refs/tags/v${version}.tar.gz"

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/../.." && pwd)"
template="${TEMPLATE:-${script_dir}/polish.rb.template}"

mkdir -p "$(dirname "$formula")"

sha256=""
for attempt in 1 2 3 4 5; do
  if sha256=$(curl -fsSL "$url" | shasum -a 256 | awk '{print $1}') && [[ -n "$sha256" ]]; then
    break
  fi
  sha256=""
  if (( attempt < 5 )); then
    echo "Tarball not ready yet (attempt ${attempt}/5), retrying in ${attempt}0s..." >&2
    sleep $((attempt * 10))
  fi
done

if [[ -z "$sha256" ]]; then
  echo "Failed to download or hash release tarball: $url" >&2
  exit 1
fi

if [[ ! -f "$formula" ]]; then
  sed \
    -e "s|{{URL}}|${url}|g" \
    -e "s|{{SHA256}}|${sha256}|g" \
    -e "s|{{VERSION}}|${version}|g" \
    "$template" >"$formula"
else
  perl -i -pe "s{^  url \".*\"}{  url \"$url\"}" "$formula"
  perl -i -pe "s{^  sha256 \".*\"}{  sha256 \"$sha256\"}" "$formula"
  perl -i -pe 's/(assert_equal ")[^"]+(", shell_output)/${1}'"$version"'${2}/' "$formula"
  perl -i -pe 's{branch: "[^"]+"}{branch: "master"}' "$formula"
fi

echo "Updated $formula for v${version}"
echo "  url:    $url"
echo "  sha256: $sha256"
