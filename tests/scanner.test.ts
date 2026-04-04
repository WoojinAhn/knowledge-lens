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
