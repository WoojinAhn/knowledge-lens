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
