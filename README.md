# knowledge-lens

Analyze markdown-based knowledge files in a repository.

## Install

```bash
npm install -g knowledge-lens
```

## Usage

```bash
lens                        # scan current directory
lens ./my-project           # scan specific path
lens . --json               # JSON output
lens . --claude             # include .claude/ files
lens . --claude --json      # both
```

## What it does

### Structure Map

Shows all `.md` files with metadata (link count, heading count, frontmatter type).

```
Structure Map
----------------------------------------
  README.md (2 links, 3 headings)
  CLAUDE.md (5 links, 4 headings)
  docs/architecture.md (8 links, 6 headings)
```

### Link Analysis

Detects broken internal links and orphan files.

```
Link Analysis
----------------------------------------
  18 valid links
  2 broken links
     CLAUDE.md:8 -> ./docs/setup.md (file not found)
  1 orphan files
     docs/old-notes.md (not referenced anywhere)
```

### `--claude` mode

Includes `.claude/notes.md` and Claude Code memory files (`~/.claude/projects/<repo>/memory/`) in the analysis.

## Options

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON (for agent consumption) |
| `--claude` | Include .claude/ directory in scan |
| `-h, --help` | Show help |
| `-v, --version` | Show version |

## v1 Scope

- Structure map (file tree + metadata)
- Internal link analysis (valid, broken, orphan)

## License

MIT
