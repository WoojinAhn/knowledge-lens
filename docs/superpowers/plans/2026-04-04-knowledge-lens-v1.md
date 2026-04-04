# knowledge-lens v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a CLI tool (`lens`) that scans markdown files in a repository and reports structure map + internal link health.

**Architecture:** Single-pass pipeline: CLI parses args → scanner collects .md files → parser extracts links/headings/frontmatter → analyzers produce structure map and link report → formatters output to terminal or JSON.

**Tech Stack:** TypeScript (ESM), Node 18+, chalk, gray-matter. No CLI framework — direct process.argv parsing.

**Spec:** `docs/superpowers/specs/2026-04-04-knowledge-lens-v1-design.md`

---

## File Structure

```
knowledge-lens/
├── package.json
├── tsconfig.json
├── .gitignore              (already exists)
├── src/
│   ├── cli.ts              # Entry point, argument parsing, orchestration
│   ├── scanner.ts          # File system traversal, .md collection
│   ├── parser.ts           # Markdown parsing (frontmatter, links, headings)
│   ├── analyzers/
│   │   ├── structure.ts    # Build directory tree with metadata
│   │   └── links.ts        # Classify links as valid/broken, find orphans
│   ├── formatters/
│   │   ├── terminal.ts     # Chalk-colored terminal output
│   │   └── json.ts         # JSON output matching spec schema
│   └── types.ts            # Shared interfaces (ParsedFile, Link, AnalysisResult, etc.)
├── tests/
│   ├── scanner.test.ts
│   ├── parser.test.ts
│   ├── analyzers/
│   │   ├── structure.test.ts
│   │   └── links.test.ts
│   ├── formatters/
│   │   └── json.test.ts
│   └── fixtures/           # Test markdown files
│       ├── basic/
│       │   ├── README.md
│       │   ├── CLAUDE.md
│       │   └── docs/
│       │       └── guide.md
│       ├── broken-links/
│       │   ├── README.md
│       │   └── CLAUDE.md
│       └── claude-mode/
│           ├── README.md
│           └── .claude/
│               └── notes.md
└── docs/
    └── superpowers/
        ├── specs/
        │   └── 2026-04-04-knowledge-lens-v1-design.md
        └── plans/
            └── 2026-04-04-knowledge-lens-v1.md (this file)
```

---

## Task 1: Project Setup

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/types.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Initialize package.json**

Create `package.json`:

```json
{
  "name": "knowledge-lens",
  "version": "0.1.0",
  "description": "Analyze markdown-based knowledge files in a repository",
  "type": "module",
  "bin": {
    "lens": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/cli.ts",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "engines": {
    "node": ">=18"
  },
  "keywords": ["markdown", "knowledge", "analysis", "cli"],
  "license": "MIT"
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Install dependencies**

```bash
npm install chalk gray-matter
npm install -D typescript tsx @types/node vitest
```

- [ ] **Step 4: Create src/types.ts with all shared interfaces**

```typescript
export interface CLIOptions {
  path: string;
  json: boolean;
  claude: boolean;
  help: boolean;
  version: boolean;
}

export interface ParsedLink {
  target: string;       // raw link target as written in markdown
  line: number;         // line number where link appears
  type: "inline" | "reference";
}

export interface ParsedFile {
  path: string;         // relative path from scan root
  absolutePath: string;
  headings: string[];   // e.g. ["# Title", "## Section"]
  links: ParsedLink[];
  frontmatter: Record<string, unknown> | null;
}

export interface StructureEntry {
  path: string;
  internalLinks: number;
  externalLinks: number;
  headings: number;
  frontmatter: Record<string, unknown> | null;
}

export interface StructureResult {
  totalFiles: number;
  files: StructureEntry[];
  tree: string;
}

export interface LinkEntry {
  source: string;  // "file.md:line"
  target: string;  // link target path
}

export interface ValidLink extends LinkEntry {
  status: "ok";
}

export interface BrokenLink extends LinkEntry {
  reason: string;
}

export interface OrphanFile {
  path: string;
  reason: string;
}

export interface LinksResult {
  valid: ValidLink[];
  broken: BrokenLink[];
  orphans: OrphanFile[];
}

export interface AnalysisResult {
  version: string;
  scannedAt: string;
  root: string;
  options: { claude: boolean };
  structure: StructureResult;
  links: LinksResult;
  summary: {
    totalFiles: number;
    validLinks: number;
    brokenLinks: number;
    orphanFiles: number;
  };
}
```

- [ ] **Step 5: Verify .gitignore has coverage**

Current `.gitignore` already has `node_modules/`, `dist/`, `.env`, `.claude/`. No changes needed.

- [ ] **Step 6: Verify setup compiles**

```bash
npx tsc --noEmit
```

Expected: No errors (types.ts has no imports to fail).

- [ ] **Step 7: Commit**

```bash
git add package.json tsconfig.json package-lock.json src/types.ts
git commit -m "chore: project setup with TypeScript, types defined"
```

---

## Task 2: Scanner

**Files:**
- Create: `src/scanner.ts`
- Create: `tests/scanner.test.ts`
- Create: `tests/fixtures/basic/README.md`
- Create: `tests/fixtures/basic/CLAUDE.md`
- Create: `tests/fixtures/basic/docs/guide.md`
- Create: `tests/fixtures/claude-mode/README.md`
- Create: `tests/fixtures/claude-mode/.claude/notes.md`

- [ ] **Step 1: Create test fixtures**

`tests/fixtures/basic/README.md`:
```markdown
# Test Project

See [guide](./docs/guide.md) for details.
```

`tests/fixtures/basic/CLAUDE.md`:
```markdown
# CLAUDE.md

## Overview

Test project instructions.
```

`tests/fixtures/basic/docs/guide.md`:
```markdown
# Guide

Detailed guide content.
```

`tests/fixtures/claude-mode/README.md`:
```markdown
# Claude Mode Test

A project with .claude directory.
```

`tests/fixtures/claude-mode/.claude/notes.md`:
```markdown
## 2026-04-01 - note - Test
Some out-of-scope finding.
```

- [ ] **Step 2: Write scanner tests**

`tests/scanner.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { scan } from "../src/scanner.js";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(__dirname, "fixtures");

describe("scanner", () => {
  it("finds all .md files in a directory recursively", async () => {
    const files = await scan(resolve(fixturesDir, "basic"), {
      claude: false,
    });
    const relative = files.map((f) => f.replace(/\\/g, "/"));
    expect(relative).toContain("README.md");
    expect(relative).toContain("CLAUDE.md");
    expect(relative).toContain("docs/guide.md");
    expect(relative).toHaveLength(3);
  });

  it("excludes node_modules and .git directories", async () => {
    const files = await scan(resolve(fixturesDir, "basic"), {
      claude: false,
    });
    const hasExcluded = files.some(
      (f) => f.includes("node_modules") || f.includes(".git")
    );
    expect(hasExcluded).toBe(false);
  });

  it("includes .claude/ files when claude option is true", async () => {
    const files = await scan(resolve(fixturesDir, "claude-mode"), {
      claude: true,
    });
    const relative = files.map((f) => f.replace(/\\/g, "/"));
    expect(relative).toContain(".claude/notes.md");
  });

  it("excludes .claude/ files by default", async () => {
    const files = await scan(resolve(fixturesDir, "claude-mode"), {
      claude: false,
    });
    const hasClaude = files.some((f) => f.includes(".claude"));
    expect(hasClaude).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run tests/scanner.test.ts
```

Expected: FAIL — `scan` function does not exist.

- [ ] **Step 4: Implement scanner**

`src/scanner.ts`:

```typescript
import { readdir, stat } from "fs/promises";
import { join, relative } from "path";

const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "vendor",
]);

interface ScanOptions {
  claude: boolean;
}

export async function scan(
  rootPath: string,
  options: ScanOptions
): Promise<string[]> {
  const files: string[] = [];
  await walkDir(rootPath, rootPath, files, options);
  return files.sort();
}

async function walkDir(
  currentPath: string,
  rootPath: string,
  files: string[],
  options: ScanOptions
): Promise<void> {
  let entries;
  try {
    entries = await readdir(currentPath, { withFileTypes: true });
  } catch {
    return; // skip directories we can't read
  }

  for (const entry of entries) {
    const fullPath = join(currentPath, entry.name);
    const relativePath = relative(rootPath, fullPath);

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      if (entry.name === ".claude" && !options.claude) continue;
      await walkDir(fullPath, rootPath, files, options);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(relativePath);
    }
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run tests/scanner.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/scanner.ts tests/scanner.test.ts tests/fixtures/
git commit -m "feat: add file scanner with recursive .md discovery"
```

---

## Task 3: Parser

**Files:**
- Create: `src/parser.ts`
- Create: `tests/parser.test.ts`

- [ ] **Step 1: Write parser tests**

`tests/parser.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { parseFile } from "../src/parser.js";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { writeFile, mkdir } from "fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(__dirname, "fixtures");

describe("parser", () => {
  it("extracts headings from markdown", async () => {
    const result = await parseFile(
      resolve(fixturesDir, "basic/README.md"),
      "README.md"
    );
    expect(result.headings).toContain("# Test Project");
  });

  it("extracts inline links", async () => {
    const result = await parseFile(
      resolve(fixturesDir, "basic/README.md"),
      "README.md"
    );
    expect(result.links).toContainEqual({
      target: "./docs/guide.md",
      line: 3,
      type: "inline",
    });
  });

  it("extracts reference-style links", async () => {
    const tempDir = resolve(fixturesDir, "parser-temp");
    await mkdir(tempDir, { recursive: true });
    const tempFile = resolve(tempDir, "ref-links.md");
    await writeFile(
      tempFile,
      "# Ref Test\n\nSee [guide][1] for details.\n\n[1]: ./docs/guide.md\n"
    );
    const result = await parseFile(tempFile, "ref-links.md");
    expect(result.links).toContainEqual({
      target: "./docs/guide.md",
      line: 5,
      type: "reference",
    });
  });

  it("extracts frontmatter with gray-matter", async () => {
    const tempDir = resolve(fixturesDir, "parser-temp");
    await mkdir(tempDir, { recursive: true });
    const tempFile = resolve(tempDir, "with-frontmatter.md");
    await writeFile(
      tempFile,
      "---\nname: test\ntype: user\n---\n\n# Content\n"
    );
    const result = await parseFile(tempFile, "with-frontmatter.md");
    expect(result.frontmatter).toEqual({ name: "test", type: "user" });
  });

  it("returns null frontmatter when none present", async () => {
    const result = await parseFile(
      resolve(fixturesDir, "basic/README.md"),
      "README.md"
    );
    expect(result.frontmatter).toBeNull();
  });

  it("distinguishes internal and external links", async () => {
    const tempDir = resolve(fixturesDir, "parser-temp");
    await mkdir(tempDir, { recursive: true });
    const tempFile = resolve(tempDir, "mixed-links.md");
    await writeFile(
      tempFile,
      "# Mixed\n\n[local](./other.md)\n[external](https://example.com)\n"
    );
    const result = await parseFile(tempFile, "mixed-links.md");
    const targets = result.links.map((l) => l.target);
    expect(targets).toContain("./other.md");
    expect(targets).not.toContain("https://example.com");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/parser.test.ts
```

Expected: FAIL — `parseFile` does not exist.

- [ ] **Step 3: Implement parser**

`src/parser.ts`:

```typescript
import { readFile } from "fs/promises";
import matter from "gray-matter";
import type { ParsedFile, ParsedLink } from "./types.js";

export async function parseFile(
  absolutePath: string,
  relativePath: string
): Promise<ParsedFile> {
  const content = await readFile(absolutePath, "utf-8");
  const { data: frontmatter, content: body } = matter(content);

  const lines = content.split("\n");
  const headings = extractHeadings(lines);
  const links = extractLinks(lines);

  return {
    path: relativePath,
    absolutePath,
    headings,
    links,
    frontmatter: Object.keys(frontmatter).length > 0 ? frontmatter : null,
  };
}

function extractHeadings(lines: string[]): string[] {
  const headings: string[] = [];
  let inFrontmatter = false;

  for (const line of lines) {
    if (line.trim() === "---") {
      inFrontmatter = !inFrontmatter;
      continue;
    }
    if (inFrontmatter) continue;

    const match = line.match(/^(#{1,6})\s+(.+)/);
    if (match) {
      headings.push(line.trim());
    }
  }
  return headings;
}

function isExternalLink(target: string): boolean {
  return /^https?:\/\//.test(target) || target.startsWith("mailto:");
}

function extractLinks(lines: string[]): ParsedLink[] {
  const links: ParsedLink[] = [];
  let inFrontmatter = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim() === "---") {
      inFrontmatter = !inFrontmatter;
      continue;
    }
    if (inFrontmatter) continue;

    // Inline links: [text](target)
    const inlineRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
    let match;
    while ((match = inlineRegex.exec(line)) !== null) {
      const target = match[2].split("#")[0].trim(); // strip anchor
      if (target && !isExternalLink(target)) {
        links.push({ target, line: i + 1, type: "inline" });
      }
    }

    // Reference link definitions: [ref]: target
    const refMatch = line.match(/^\[([^\]]+)\]:\s+(\S+)/);
    if (refMatch) {
      const target = refMatch[2].split("#")[0].trim();
      if (target && !isExternalLink(target)) {
        links.push({ target, line: i + 1, type: "reference" });
      }
    }
  }

  return links;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/parser.test.ts
```

Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/parser.ts tests/parser.test.ts
git commit -m "feat: add markdown parser with link and heading extraction"
```

---

## Task 4: Structure Analyzer

**Files:**
- Create: `src/analyzers/structure.ts`
- Create: `tests/analyzers/structure.test.ts`

- [ ] **Step 1: Write structure analyzer tests**

`tests/analyzers/structure.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { analyzeStructure } from "../../src/analyzers/structure.js";
import type { ParsedFile } from "../../src/types.js";

const mockFiles: ParsedFile[] = [
  {
    path: "README.md",
    absolutePath: "/project/README.md",
    headings: ["# Project", "## Install"],
    links: [
      { target: "./docs/guide.md", line: 5, type: "inline" },
      { target: "./CLAUDE.md", line: 7, type: "inline" },
    ],
    frontmatter: null,
  },
  {
    path: "CLAUDE.md",
    absolutePath: "/project/CLAUDE.md",
    headings: ["# CLAUDE.md", "## Overview"],
    links: [],
    frontmatter: null,
  },
  {
    path: "docs/guide.md",
    absolutePath: "/project/docs/guide.md",
    headings: ["# Guide"],
    links: [{ target: "../README.md", line: 3, type: "inline" }],
    frontmatter: null,
  },
];

describe("structure analyzer", () => {
  it("counts total files", () => {
    const result = analyzeStructure(mockFiles);
    expect(result.totalFiles).toBe(3);
  });

  it("computes per-file metadata", () => {
    const result = analyzeStructure(mockFiles);
    const readme = result.files.find((f) => f.path === "README.md");
    expect(readme).toBeDefined();
    expect(readme!.internalLinks).toBe(2);
    expect(readme!.headings).toBe(2);
  });

  it("generates a tree string", () => {
    const result = analyzeStructure(mockFiles);
    expect(result.tree).toContain("README.md");
    expect(result.tree).toContain("docs/");
    expect(result.tree).toContain("guide.md");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/analyzers/structure.test.ts
```

Expected: FAIL — `analyzeStructure` does not exist.

- [ ] **Step 3: Implement structure analyzer**

`src/analyzers/structure.ts`:

```typescript
import type { ParsedFile, StructureResult, StructureEntry } from "../types.js";

export function analyzeStructure(files: ParsedFile[]): StructureResult {
  const entries: StructureEntry[] = files.map((file) => ({
    path: file.path,
    internalLinks: file.links.length,
    externalLinks: 0, // tracked but not counted in v1 (all extracted links are internal)
    headings: file.headings.length,
    frontmatter: file.frontmatter,
  }));

  const tree = buildTree(files.map((f) => f.path));

  return {
    totalFiles: files.length,
    files: entries,
    tree,
  };
}

function buildTree(paths: string[]): string {
  const sorted = [...paths].sort();
  const lines: string[] = [];
  const dirs = new Set<string>();

  for (const filePath of sorted) {
    const parts = filePath.split("/");
    // Add directory entries
    for (let i = 0; i < parts.length - 1; i++) {
      const dirPath = parts.slice(0, i + 1).join("/");
      if (!dirs.has(dirPath)) {
        dirs.add(dirPath);
        const indent = "  ".repeat(i);
        lines.push(`${indent}${parts[i]}/`);
      }
    }
    // Add file entry
    const indent = "  ".repeat(parts.length - 1);
    lines.push(`${indent}${parts[parts.length - 1]}`);
  }

  return lines.join("\n");
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/analyzers/structure.test.ts
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/analyzers/structure.ts tests/analyzers/structure.test.ts
git commit -m "feat: add structure map analyzer"
```

---

## Task 5: Link Analyzer

**Files:**
- Create: `src/analyzers/links.ts`
- Create: `tests/analyzers/links.test.ts`
- Create: `tests/fixtures/broken-links/README.md`
- Create: `tests/fixtures/broken-links/CLAUDE.md`

- [ ] **Step 1: Create broken-links fixture**

`tests/fixtures/broken-links/README.md`:
```markdown
# Broken Links Test

[valid link](./CLAUDE.md)
[broken link](./docs/nonexistent.md)
```

`tests/fixtures/broken-links/CLAUDE.md`:
```markdown
# CLAUDE.md

[also broken](./missing.md)
```

- [ ] **Step 2: Write link analyzer tests**

`tests/analyzers/links.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { analyzeLinks } from "../../src/analyzers/links.js";
import type { ParsedFile } from "../../src/types.js";

describe("link analyzer", () => {
  it("identifies valid links", () => {
    const files: ParsedFile[] = [
      {
        path: "README.md",
        absolutePath: "/project/README.md",
        headings: ["# Test"],
        links: [{ target: "./CLAUDE.md", line: 3, type: "inline" }],
        frontmatter: null,
      },
      {
        path: "CLAUDE.md",
        absolutePath: "/project/CLAUDE.md",
        headings: ["# CLAUDE"],
        links: [],
        frontmatter: null,
      },
    ];

    const result = analyzeLinks(files, "/project");
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0].source).toBe("README.md:3");
    expect(result.broken).toHaveLength(0);
  });

  it("identifies broken links", () => {
    const files: ParsedFile[] = [
      {
        path: "README.md",
        absolutePath: "/project/README.md",
        headings: ["# Test"],
        links: [{ target: "./docs/nonexistent.md", line: 4, type: "inline" }],
        frontmatter: null,
      },
    ];

    const result = analyzeLinks(files, "/project");
    expect(result.broken).toHaveLength(1);
    expect(result.broken[0].source).toBe("README.md:4");
    expect(result.broken[0].reason).toBe("file not found");
  });

  it("identifies orphan files", () => {
    const files: ParsedFile[] = [
      {
        path: "README.md",
        absolutePath: "/project/README.md",
        headings: ["# Test"],
        links: [],
        frontmatter: null,
      },
      {
        path: "docs/forgotten.md",
        absolutePath: "/project/docs/forgotten.md",
        headings: ["# Forgotten"],
        links: [],
        frontmatter: null,
      },
    ];

    const result = analyzeLinks(files, "/project");
    expect(result.orphans).toContainEqual({
      path: "docs/forgotten.md",
      reason: "not referenced by any file",
    });
  });

  it("does not mark README.md or CLAUDE.md as orphans", () => {
    const files: ParsedFile[] = [
      {
        path: "README.md",
        absolutePath: "/project/README.md",
        headings: ["# Test"],
        links: [],
        frontmatter: null,
      },
      {
        path: "CLAUDE.md",
        absolutePath: "/project/CLAUDE.md",
        headings: ["# CLAUDE"],
        links: [],
        frontmatter: null,
      },
    ];

    const result = analyzeLinks(files, "/project");
    expect(result.orphans).toHaveLength(0);
  });

  it("resolves relative paths correctly", () => {
    const files: ParsedFile[] = [
      {
        path: "docs/guide.md",
        absolutePath: "/project/docs/guide.md",
        headings: ["# Guide"],
        links: [{ target: "../README.md", line: 3, type: "inline" }],
        frontmatter: null,
      },
      {
        path: "README.md",
        absolutePath: "/project/README.md",
        headings: ["# Test"],
        links: [],
        frontmatter: null,
      },
    ];

    const result = analyzeLinks(files, "/project");
    expect(result.valid).toHaveLength(1);
    expect(result.broken).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run tests/analyzers/links.test.ts
```

Expected: FAIL — `analyzeLinks` does not exist.

- [ ] **Step 4: Implement link analyzer**

`src/analyzers/links.ts`:

```typescript
import { existsSync } from "fs";
import { resolve, dirname, normalize } from "path";
import type {
  ParsedFile,
  LinksResult,
  ValidLink,
  BrokenLink,
  OrphanFile,
} from "../types.js";

// Files that are never considered orphans (conventional root documents)
const WELL_KNOWN_FILES = new Set([
  "readme.md",
  "claude.md",
  "changelog.md",
  "contributing.md",
  "license.md",
  "memory.md",
]);

export function analyzeLinks(
  files: ParsedFile[],
  rootPath: string
): LinksResult {
  const valid: ValidLink[] = [];
  const broken: BrokenLink[] = [];

  const filePathSet = new Set(files.map((f) => normalize(f.path)));

  // Build set of referenced files (for orphan detection)
  const referencedFiles = new Set<string>();

  for (const file of files) {
    const fileDir = dirname(file.path);

    for (const link of file.links) {
      // Resolve the link target relative to the file's directory
      const resolvedRelative = normalize(
        fileDir === "." ? link.target : `${fileDir}/${link.target}`
      );

      const resolvedAbsolute = resolve(rootPath, resolvedRelative);
      const source = `${file.path}:${link.line}`;

      if (filePathSet.has(resolvedRelative) || existsSync(resolvedAbsolute)) {
        valid.push({ source, target: link.target, status: "ok" });
        referencedFiles.add(resolvedRelative);
      } else {
        broken.push({ source, target: link.target, reason: "file not found" });
      }
    }
  }

  // Find orphan files
  const orphans: OrphanFile[] = [];
  for (const file of files) {
    const normalized = normalize(file.path);
    const basename = file.path.split("/").pop()?.toLowerCase() ?? "";

    if (WELL_KNOWN_FILES.has(basename)) continue;
    if (referencedFiles.has(normalized)) continue;

    orphans.push({
      path: file.path,
      reason: "not referenced by any file",
    });
  }

  return { valid, broken, orphans };
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run tests/analyzers/links.test.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/analyzers/links.ts tests/analyzers/links.test.ts tests/fixtures/broken-links/
git commit -m "feat: add link analyzer with broken/orphan detection"
```

---

## Task 6: JSON Formatter

**Files:**
- Create: `src/formatters/json.ts`
- Create: `tests/formatters/json.test.ts`

- [ ] **Step 1: Write JSON formatter tests**

`tests/formatters/json.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { formatJson } from "../../src/formatters/json.js";
import type { AnalysisResult } from "../../src/types.js";

const mockResult: AnalysisResult = {
  version: "0.1.0",
  scannedAt: "2026-04-04T15:30:00.000Z",
  root: ".",
  options: { claude: false },
  structure: {
    totalFiles: 2,
    files: [
      {
        path: "README.md",
        internalLinks: 1,
        externalLinks: 0,
        headings: 2,
        frontmatter: null,
      },
      {
        path: "CLAUDE.md",
        internalLinks: 0,
        externalLinks: 0,
        headings: 1,
        frontmatter: null,
      },
    ],
    tree: "CLAUDE.md\nREADME.md",
  },
  links: {
    valid: [
      { source: "README.md:3", target: "./CLAUDE.md", status: "ok" },
    ],
    broken: [],
    orphans: [],
  },
  summary: {
    totalFiles: 2,
    validLinks: 1,
    brokenLinks: 0,
    orphanFiles: 0,
  },
};

describe("json formatter", () => {
  it("produces valid JSON", () => {
    const output = formatJson(mockResult);
    expect(() => JSON.parse(output)).not.toThrow();
  });

  it("includes all top-level fields", () => {
    const output = formatJson(mockResult);
    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty("version");
    expect(parsed).toHaveProperty("scannedAt");
    expect(parsed).toHaveProperty("structure");
    expect(parsed).toHaveProperty("links");
    expect(parsed).toHaveProperty("summary");
  });

  it("preserves summary counts", () => {
    const output = formatJson(mockResult);
    const parsed = JSON.parse(output);
    expect(parsed.summary.totalFiles).toBe(2);
    expect(parsed.summary.validLinks).toBe(1);
    expect(parsed.summary.brokenLinks).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/formatters/json.test.ts
```

Expected: FAIL — `formatJson` does not exist.

- [ ] **Step 3: Implement JSON formatter**

`src/formatters/json.ts`:

```typescript
import type { AnalysisResult } from "../types.js";

export function formatJson(result: AnalysisResult): string {
  return JSON.stringify(result, null, 2);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/formatters/json.test.ts
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/formatters/json.ts tests/formatters/json.test.ts
git commit -m "feat: add JSON output formatter"
```

---

## Task 7: Terminal Formatter

**Files:**
- Create: `src/formatters/terminal.ts`

- [ ] **Step 1: Implement terminal formatter**

No unit tests for terminal output — it's visual and changes frequently. Verified manually during integration.

`src/formatters/terminal.ts`:

```typescript
import chalk from "chalk";
import type { AnalysisResult } from "../types.js";

export function formatTerminal(result: AnalysisResult): string {
  const lines: string[] = [];

  lines.push("");
  lines.push(chalk.bold("Structure Map"));
  lines.push(chalk.dim("-".repeat(40)));

  for (const file of result.structure.files) {
    const meta = `${file.internalLinks} links, ${file.headings} headings`;
    const fm = file.frontmatter
      ? chalk.dim(` [${(file.frontmatter as Record<string, unknown>).type ?? "unknown"}]`)
      : "";
    lines.push(`  ${file.path} ${chalk.dim(`(${meta})`)}${fm}`);
  }

  lines.push("");
  lines.push(chalk.dim("Tree:"));
  for (const treeLine of result.structure.tree.split("\n")) {
    lines.push(`  ${chalk.dim(treeLine)}`);
  }

  lines.push("");
  lines.push(chalk.bold("Link Analysis"));
  lines.push(chalk.dim("-".repeat(40)));

  if (result.links.valid.length > 0) {
    lines.push(
      chalk.green(`  ${result.summary.validLinks} valid links`)
    );
  }

  if (result.links.broken.length > 0) {
    lines.push(
      chalk.red(`  ${result.summary.brokenLinks} broken links`)
    );
    for (const link of result.links.broken) {
      lines.push(chalk.red(`     ${link.source} -> ${link.target} (${link.reason})`));
    }
  }

  if (result.links.orphans.length > 0) {
    lines.push(
      chalk.yellow(`  ${result.summary.orphanFiles} orphan files`)
    );
    for (const orphan of result.links.orphans) {
      lines.push(chalk.yellow(`     ${orphan.path} (${orphan.reason})`));
    }
  }

  if (
    result.links.broken.length === 0 &&
    result.links.orphans.length === 0
  ) {
    lines.push(chalk.green("  All clear - no broken links or orphan files."));
  }

  lines.push("");
  lines.push(chalk.dim(`Scanned ${result.summary.totalFiles} files at ${result.root}`));
  lines.push("");

  return lines.join("\n");
}
```

- [ ] **Step 2: Commit**

```bash
git add src/formatters/terminal.ts
git commit -m "feat: add terminal output formatter with chalk"
```

---

## Task 8: CLI Entry Point & Integration

**Files:**
- Create: `src/cli.ts`

- [ ] **Step 1: Implement CLI entry point**

`src/cli.ts`:

```typescript
#!/usr/bin/env node

import { resolve } from "path";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { scan } from "./scanner.js";
import { parseFile } from "./parser.js";
import { analyzeStructure } from "./analyzers/structure.js";
import { analyzeLinks } from "./analyzers/links.js";
import { formatJson } from "./formatters/json.js";
import { formatTerminal } from "./formatters/terminal.js";
import type { CLIOptions, AnalysisResult } from "./types.js";

function parseArgs(argv: string[]): CLIOptions {
  const args = argv.slice(2);
  const options: CLIOptions = {
    path: ".",
    json: false,
    claude: false,
    help: false,
    version: false,
  };

  for (const arg of args) {
    switch (arg) {
      case "--json":
        options.json = true;
        break;
      case "--claude":
        options.claude = true;
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      case "--version":
      case "-v":
        options.version = true;
        break;
      default:
        if (!arg.startsWith("-")) {
          options.path = arg;
        } else {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
Usage: lens [path] [options]

Analyze markdown-based knowledge files in a repository.

Arguments:
  path          Directory to scan (default: current directory)

Options:
  --json        Output in JSON format
  --claude      Include .claude/ directory in scan
  -h, --help    Show this help
  -v, --version Show version
`);
}

async function getVersion(): Promise<string> {
  try {
    const pkgPath = new URL("../package.json", import.meta.url);
    const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
    return pkg.version;
  } catch {
    return "unknown";
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv);

  if (options.help) {
    printHelp();
    return;
  }

  if (options.version) {
    console.log(await getVersion());
    return;
  }

  const rootPath = resolve(options.path);

  if (!existsSync(rootPath)) {
    console.error(`Error: path does not exist: ${rootPath}`);
    process.exit(1);
  }

  // Scan
  const filePaths = await scan(rootPath, { claude: options.claude });

  if (filePaths.length === 0) {
    console.log("No markdown files found.");
    return;
  }

  // Parse
  const parsedFiles = await Promise.all(
    filePaths.map((relativePath) =>
      parseFile(resolve(rootPath, relativePath), relativePath)
    )
  );

  // Analyze
  const structure = analyzeStructure(parsedFiles);
  const links = analyzeLinks(parsedFiles, rootPath);

  // Build result
  const result: AnalysisResult = {
    version: await getVersion(),
    scannedAt: new Date().toISOString(),
    root: options.path,
    options: { claude: options.claude },
    structure,
    links,
    summary: {
      totalFiles: structure.totalFiles,
      validLinks: links.valid.length,
      brokenLinks: links.broken.length,
      orphanFiles: links.orphans.length,
    },
  };

  // Format and output
  if (options.json) {
    console.log(formatJson(result));
  } else {
    console.log(formatTerminal(result));
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
```

- [ ] **Step 2: Verify the full pipeline works in dev mode**

```bash
npx tsx src/cli.ts ./tests/fixtures/basic
```

Expected: Terminal output showing structure map and link analysis for the basic fixture.

```bash
npx tsx src/cli.ts ./tests/fixtures/basic --json
```

Expected: JSON output matching the spec schema.

```bash
npx tsx src/cli.ts ./tests/fixtures/broken-links
```

Expected: Terminal output showing broken links.

- [ ] **Step 3: Verify build works**

```bash
npm run build
node dist/cli.js ./tests/fixtures/basic
```

Expected: Same output as dev mode.

- [ ] **Step 4: Verify --help and --version**

```bash
npx tsx src/cli.ts --help
npx tsx src/cli.ts --version
```

Expected: Help text and "0.1.0".

- [ ] **Step 5: Commit**

```bash
git add src/cli.ts
git commit -m "feat: add CLI entry point with full pipeline integration"
```

---

## Task 9: Run Full Test Suite & Final Verification

**Files:**
- No new files

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: All tests pass (scanner: 4, parser: 6, structure: 3, links: 5, json: 3 = 21 total).

- [ ] **Step 2: Test against a real project**

```bash
npx tsx src/cli.ts /Users/woojin/home/knowledge-lens
```

Expected: Shows README.md, CLAUDE.md, and docs/ structure with link analysis.

- [ ] **Step 3: Test --claude flag against real project**

```bash
npx tsx src/cli.ts /Users/woojin/home/knowledge-lens --claude
```

Expected: Additional .claude/ files shown if they exist for this project.

- [ ] **Step 4: Test --json output is valid**

```bash
npx tsx src/cli.ts /Users/woojin/home/knowledge-lens --json | node -e "process.stdin.resume(); let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{JSON.parse(d); console.log('Valid JSON')})"
```

Expected: "Valid JSON"

- [ ] **Step 5: Build and verify dist**

```bash
npm run build && node dist/cli.js --help
```

Expected: Help text.

- [ ] **Step 6: Final commit if any fixes were needed**

Only if changes were made during testing.

---

## Task 10: Update Project Files

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update README.md with installation and usage**

Replace the current README.md content with updated installation instructions, usage examples, and output examples based on actual `lens` output from Task 9.

- [ ] **Step 2: Update CLAUDE.md tech stack**

Change the `Tech Stack` section from "TBD" to:

```markdown
## Tech Stack

- TypeScript (ESM, Node 18+)
- chalk (terminal formatting)
- gray-matter (frontmatter parsing)
- vitest (testing)
```

- [ ] **Step 3: Commit**

```bash
git add README.md CLAUDE.md
git commit -m "docs: update README and CLAUDE.md with v1 details"
```
