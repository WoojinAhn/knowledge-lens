# knowledge-lens v1 Design Spec

## Overview

knowledge-lens is a CLI tool that analyzes markdown-based knowledge files in a repository. It scans `.md` files, diagnoses structure and link health, and outputs results in human-readable or machine-consumable formats.

- **Package name**: `knowledge-lens` (npm)
- **CLI command**: `lens`
- **Primary consumers**: AI coding agents (JSON) and humans (terminal)

## CLI Interface

```
lens [path] [options]

Arguments:
  path          Directory to scan (default: current directory)

Options:
  --json        Output in JSON format
  --claude      Include .claude/ directory in scan
  --help        Show help
  --version     Show version
```

Examples:
```bash
lens                     # Scan current directory, terminal output
lens ./my-project        # Scan specific path
lens . --json            # JSON output
lens . --claude          # Include .claude/ memory files
lens . --claude --json   # Both
```

## Tech Stack

- **Language**: TypeScript (ESM, Node 18+)
- **CLI framework**: Direct `process.argv` parsing (no framework)
- **Dependencies (runtime)**: `chalk`, `gray-matter`
- **Dependencies (dev)**: `typescript`, `tsx`, `@types/node`
- **Build**: `tsc` → `dist/`
- **Dev**: `tsx src/cli.ts`

## Architecture

Single-pass pipeline:

```
cli.ts → scanner.ts → parser.ts → analyzers/* → formatters/* → stdout
```

### Module Structure

```
src/
├── cli.ts           # Argument parsing, entry point
├── scanner.ts       # File system traversal, .md file collection
├── parser.ts        # .md file parsing (frontmatter, link/heading extraction)
├── analyzers/
│   ├── structure.ts # Structure map generation
│   └── links.ts     # Link validation (broken, orphan detection)
├── formatters/
│   ├── terminal.ts  # Colored terminal output
│   └── json.ts      # JSON output
└── types.ts         # Shared type definitions
```

### Data Flow

| Module | Input | Output |
|--------|-------|--------|
| scanner | path + options | `string[]` (file paths) |
| parser | file path | `ParsedFile[]` (frontmatter, links, headings) |
| structure | `ParsedFile[]` | Tree structure + metadata |
| links | `ParsedFile[]` | broken/orphan/valid link lists |
| formatter | Analysis results | Formatted string or JSON |

## Scan Targets

### Default mode (`lens .`)

- All `*.md` files recursively under target path
- Excluded: `node_modules/`, `.git/`, `dist/`, `build/`, `vendor/`
- Respects `.gitignore` patterns

### `--claude` mode

Default mode plus:

| Path | Description |
|------|-------------|
| `<repo>/.claude/notes.md` | Out-of-scope findings log (in-repo, usually gitignored) |
| `~/.claude/projects/<encoded-repo-path>/memory/MEMORY.md` | Memory index (global path) |
| `~/.claude/projects/<encoded-repo-path>/memory/*.md` | Individual memory files (global path) |

The encoded repo path follows Claude Code's convention: absolute path with `/` replaced by `-` (e.g., `/Users/woojin/home/my-project` → `-Users-woojin-home-my-project`).

Note: Memory files live in the global `~/.claude/` directory, not inside the repo. The `--claude` flag resolves the current repo's corresponding memory path automatically.

## v1 Analyzers

### Structure Map

Reconstructs parsed file list into a directory tree with metadata per file:

- Link count (internal/external)
- Heading count
- In `--claude` mode: memory file frontmatter `type` and `description`

Terminal output example:
```
📁 my-project/
├── README.md (12 links, 3 headings)
├── CLAUDE.md (5 links, 4 headings)
├── docs/
│   ├── architecture.md (8 links, 6 headings)
│   └── api-guide.md (3 links, 2 headings)
└── .claude/  [--claude]
    ├── notes.md (7 entries)
    └── memory/ (4 files, MEMORY.md index)
```

### Link Analysis

Internal links only (external URLs deferred to v2).

Detected link syntaxes:
- Inline links: `[text](./path.md)`
- Reference links: `[text][ref]` with `[ref]: ./path.md`
- MEMORY.md index links: `- [Title](file.md)` (Markdown link in list item)

Not detected in v1:
- Bare paths without link syntax
- Anchor-only links (`#heading`)
- HTML `<a href>` tags

| Category | Meaning |
|----------|---------|
| **valid** | Target file exists |
| **broken** | Target file not found |
| **orphan** | .md file not referenced by any other file |

`--claude` mode additional checks:
- Entry in MEMORY.md but file missing → broken
- Memory file exists but not in MEMORY.md index → orphan

Terminal output example:
```
🔗 Link Analysis
  ✅ 18 valid links
  ❌ 2 broken links
     CLAUDE.md:8 → ./docs/setup.md (file not found)
     docs/api-guide.md:15 → ./docs/auth.md (file not found)
  ⚠️  1 orphan file
     docs/old-migration-notes.md (not referenced anywhere)
```

## JSON Output Schema

```json
{
  "version": "1.0.0",
  "scannedAt": "2026-04-04T15:30:00Z",
  "root": "./my-project",
  "options": { "claude": false },
  "structure": {
    "totalFiles": 5,
    "files": [
      {
        "path": "README.md",
        "headings": ["# my-project", "## Install", "## Usage"],
        "internalLinks": 3,
        "frontmatter": null
      }
    ],
    "tree": "README.md\nCLAUDE.md\ndocs/\n  architecture.md\n  api-guide.md"
  },
  "links": {
    "valid": [
      { "source": "README.md:8", "target": "./docs/architecture.md", "status": "ok" }
    ],
    "broken": [
      { "source": "CLAUDE.md:8", "target": "./docs/setup.md", "reason": "file not found" }
    ],
    "orphans": [
      { "path": "docs/old-notes.md", "reason": "not referenced by any file" }
    ]
  },
  "summary": {
    "totalFiles": 5,
    "validLinks": 18,
    "brokenLinks": 2,
    "orphanFiles": 1
  }
}
```

- `summary`: Quick status check for agents
- `links.broken` and `links.orphans`: Actionable items
- `structure.files[].headings`: Document internal structure

## Error Handling

| Situation | Behavior |
|-----------|----------|
| Path does not exist | Error message + exit code 1 |
| No .md files found | "No markdown files found" + exit code 0 |
| File read permission denied | Skip file, warn, continue |
| `--claude` but no `.claude/` | Warn, proceed in default mode |
| Symlink cycle | Follow symlinks, skip on cycle detection |

Exit codes:
- `0`: Completed successfully (broken links still exit 0 — this is an analysis tool, not a linter)
- `1`: Execution failure

## Scope Boundaries

### v1 (this spec)
- Structure map
- Internal link analysis

### v1.1+
- Duplicate detection (content similarity)
- Recommendations (merge candidates, missing links)

### v2
- External URL validation
- Semantic analysis
- Markdown report output (`--output report.md`)
- `--claude-global` for `~/.claude/` scan
