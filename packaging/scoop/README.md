# Scoop (Windows)

Install:

```powershell
scoop install nodejs
scoop install https://raw.githubusercontent.com/aresgott/polish/main/packaging/scoop/polish.json
```

Upgrade:

```powershell
scoop update polish
```

The manifest installs `@aresgott/polish` from npm and falls back to GitHub if the package is not published yet.

Version checks use the npm registry (`@aresgott/polish`).

## CI

On every release (tag push, published release, or manual workflow dispatch), CI runs `packaging/scoop/bump-version.sh` and commits the updated manifest to `main`.
