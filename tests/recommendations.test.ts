import { describe, expect, it } from "vitest";
import { buildRecommendations } from "../src/recommendations.js";
import type { AnalysisResult } from "../src/types.js";

const result: AnalysisResult = {
  version: "0.1.0",
  scannedAt: "2026-09-04T00:00:00.000Z",
  root: ".",
  options: { claude: false },
  structure: {
    totalFiles: 2,
    files: [],
    tree: "README.md\ndocs/old-notes.md",
  },
  links: {
    valid: [],
    broken: [
      {
        source: "README.md:8",
        target: "./docs/setup.md",
        reason: "file not found",
      },
    ],
    orphans: [
      {
        path: "docs/old-notes.md",
        reason: "not referenced by any file",
      },
    ],
  },
  summary: {
    totalFiles: 2,
    validLinks: 0,
    brokenLinks: 1,
    orphanFiles: 1,
  },
};

describe("buildRecommendations", () => {
  it("turns link findings into concrete next actions", () => {
    expect(buildRecommendations(result)).toEqual([
      "README.md:8: Update or remove the link to ./docs/setup.md, or create the missing file.",
      "docs/old-notes.md: Link this file from an index such as README.md, or remove it if obsolete.",
    ]);
  });
});
