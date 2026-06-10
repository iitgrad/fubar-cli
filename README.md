# FUBAR CLI

`fubar` is a Bun + TypeScript + Commander.js CLI that simulates something.

## Installation

```bash
bun install
bun run build
bun link
```

After linking, the executable is:

```bash
fubar --help
```

State is stored in `~/.fubar/fubar.db` by default. For tests or isolated demos, set:

```bash
export FUBAR_DB_PATH=/tmp/fubar-demo.db
```

## Quick Start

```bash
fubar --help
```
