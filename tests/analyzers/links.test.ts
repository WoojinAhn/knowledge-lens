import { describe, it, expect } from "vitest";
import { analyzeLinks } from "../../src/analyzers/links.js";
import type { ParsedFile } from "../../src/types.js";

describe("link analyzer", () => {
  it("identifies valid links", async () => {
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

    const result = await analyzeLinks(files, "/project");
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0].source).toBe("README.md:3");
    expect(result.broken).toHaveLength(0);
  });

  it("identifies broken links", async () => {
    const files: ParsedFile[] = [
      {
        path: "README.md",
        absolutePath: "/project/README.md",
        headings: ["# Test"],
        links: [{ target: "./docs/nonexistent.md", line: 4, type: "inline" }],
        frontmatter: null,
      },
    ];

    const result = await analyzeLinks(files, "/project");
    expect(result.broken).toHaveLength(1);
    expect(result.broken[0].source).toBe("README.md:4");
    expect(result.broken[0].reason).toBe("file not found");
  });

  it("identifies orphan files", async () => {
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

    const result = await analyzeLinks(files, "/project");
    expect(result.orphans).toContainEqual({
      path: "docs/forgotten.md",
      reason: "not referenced by any file",
    });
  });

  it("does not mark README.md or CLAUDE.md as orphans", async () => {
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

    const result = await analyzeLinks(files, "/project");
    expect(result.orphans).toHaveLength(0);
  });

  it("resolves relative paths correctly", async () => {
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

    const result = await analyzeLinks(files, "/project");
    expect(result.valid).toHaveLength(1);
    expect(result.broken).toHaveLength(0);
  });
});
