# knowledge-lens

Analyze and diagnose all markdown-based knowledge in a repository.

## What it does

Scans all `.md` files and `.claude/` knowledge files in a repo, then provides:

- **Structure map**: Hierarchical view of all markdown files and their relationships
- **Link analysis**: Internal cross-references, orphan documents, broken links between .md files
- **Duplicate detection**: Content overlap between files
- **Recommendations**: Merge candidates, missing links, skill-ification suggestions

## Scan targets

| Source | Description |
|--------|-------------|
| `*.md` (repo root & subdirs) | CLAUDE.md, README, knowledge files, guides, etc. |
| `.claude/notes.md` | Out-of-scope findings log |
| `.claude/projects/*/memory/` | Auto memory files + MEMORY.md index |
| `~/.claude/CLAUDE.md` | (optional) Global instructions |
| `~/.claude/projects/*/memory/` | (optional) Global memory |

## Scope

- **v1**: .md files only, internal link relationships
- **v2**: External references (URLs, scripts), deeper semantic analysis

## Status

Early development.
