# CLAUDE.md

## Overview

knowledge-lens: a CLI tool that analyzes all markdown-based knowledge files in a repository.

Scans .md files and .claude/ knowledge files, then diagnoses structure and link health. Supports `.lensignore` for project-specific exclusions.

## Context

- Parent workspace: `/Users/woojin/home` — see its `CLAUDE.md` for global conventions
- Issues tracked in `WoojinAhn/backlog` repo

## Tech Stack

- TypeScript (ESM, Node 18+)
- chalk (terminal formatting)
- gray-matter (frontmatter parsing)
- vitest (testing)
