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
