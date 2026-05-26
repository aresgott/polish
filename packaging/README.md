# Packaging

Distribution files for Polish across platforms.

```
packaging/
├── homebrew/          # macOS tap (formula lives in aresgott/homebrew-polish)
│   ├── polish.rb.template
│   ├── update-formula.sh
│   └── sha256.sh
├── scoop/             # Windows (Scoop manifest)
│   ├── polish.json
│   └── bump-version.sh
└── linux/             # Linux installer script
    └── install.sh
```

## Platform summary

| Platform | Method | Source |
|----------|--------|--------|
| macOS | Homebrew | [aresgott/homebrew-polish](https://github.com/aresgott/homebrew-polish) |
| macOS / Linux / Windows | npm | `@aresgott/polish` |
| Linux | install script | `packaging/linux/install.sh` |
| Windows | Scoop | `packaging/scoop/polish.json` |

## Release checklist

After merging to `main`:

1. Bump `version` in `package.json` (and run `npm run build` if you commit `dist/`).
2. Commit and push to `main`.
3. Tag and push:

   ```bash
   git tag vX.Y.Z
   git push origin main
   git push origin vX.Y.Z
   ```

4. CI (`.github/workflows/release.yml`) will:
   - Create the GitHub release (tag push)
   - Update **homebrew-polish** formula (`url`, `sha256`, test version)
   - Bump `packaging/scoop/polish.json` on `main`

5. Publish to npm:

   ```bash
   npm publish
   ```

## Manual workflow dispatch

**Actions → Release → Run workflow** on `main`:

- **Version:** e.g. `v1.0.0`
- **Update Homebrew only:** check to skip Scoop manifest update

Use this to re-run Homebrew or Scoop updates without creating a new tag.

## Backward-compatible paths

| Legacy path | Forwards to |
|-------------|-------------|
| `scripts/install.sh` | `packaging/linux/install.sh` |
| `scripts/update-homebrew-formula.sh` | `packaging/homebrew/update-formula.sh` |
| `scripts/homebrew-sha256.sh` | `packaging/homebrew/sha256.sh` |
| `scoop/polish.json` | copy of `packaging/scoop/polish.json` (kept for old Scoop URLs) |
