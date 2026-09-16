# my-office-work-log

An Electron application with React and TypeScript

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```

### Validation

Run the complete automated validation suite:

```bash
$ npm run validate
```

### Portable Windows File Association Smoke Test

Build `dist/MOWL-<version>-portable.exe` with `npm run build:win`, then run it once. The packaged
application registers the per-user `.mowldb` association. Double-click a valid `.mowldb` file to
verify that MOWL opens it; double-clicking a file while MOWL is already running focuses the existing
window and switches to that database. Missing or invalid files keep the current workspace open and
display an error.
