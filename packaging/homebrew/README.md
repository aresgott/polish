# Homebrew tap

Polish is distributed on macOS via the separate tap repo:

**[aresgott/homebrew-polish](https://github.com/aresgott/homebrew-polish)**

Users install with:

```bash
brew tap aresgott/polish
brew install polish
```

## Files in this repo

| File | Purpose |
|------|---------|
| `polish.rb.template` | Formula template for new releases |
| `update-formula.sh` | Update `url`, `sha256`, and test version |
| `sha256.sh` | Print tarball hash for manual verification |

## Manual formula update

From a clone of **homebrew-polish**:

```bash
export FORMULA_PATH=Formula/polish.rb
/path/to/polish/packaging/homebrew/update-formula.sh 1.0.0

git add Formula/polish.rb
git commit -m "chore(formula): update for v1.0.0"
git push origin master
```

## CI

Tag pushes on **aresgott/polish** run `.github/workflows/release.yml`, which checks out **homebrew-polish**, runs `update-formula.sh`, and pushes the updated formula.

Required secret on **aresgott/polish** (one of):

- `HOMEBREW_DEPLOY_KEY` — SSH deploy key with write access to **homebrew-polish** (recommended)
- `HOMEBREW_TAP_TOKEN` — PAT with **Contents: Read and write** on **homebrew-polish**
