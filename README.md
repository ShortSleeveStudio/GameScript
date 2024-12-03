# GameScript

GameScript is cross-platform dialogue middleware for game engines. Right now we support Unity and Godot, but there's no reason why an Unreal plugin couldn't exist.

GameScript is composed of the following components:
1. GameScript, the Electron application for creating and exporting dialogue trees.
2. GameScript plugins for Unity and Godot to use the exported dialogue trees.

The Electron application was made with Svelte and TypeScript and this is its repository. All documentation lives at the following link:
https://github.com/ShortSleeveStudio/GameScriptDocumentation/wiki

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) + [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode)

## Project Setup

### Install

```bash
$ pnpm install
```

### Development

```bash
$ pnpm dev
```

### Build

```bash
# For windows
$ pnpm build:win

# For macOS
$ pnpm build:mac

# For Linux
$ pnpm build:linux
```
