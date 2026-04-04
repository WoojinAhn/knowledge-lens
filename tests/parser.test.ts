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

  it("ignores links inside code blocks", async () => {
    const tempDir = resolve(fixturesDir, "parser-temp");
    await mkdir(tempDir, { recursive: true });
    const tempFile = resolve(tempDir, "codeblock.md");
    await writeFile(
      tempFile,
      "# Doc\n\n[real](./real.md)\n\n```markdown\n[fake](./fake.md)\n```\n"
    );
    const result = await parseFile(tempFile, "codeblock.md");
    const targets = result.links.map((l) => l.target);
    expect(targets).toContain("./real.md");
    expect(targets).not.toContain("./fake.md");
  });

  it("ignores headings inside code blocks", async () => {
    const tempDir = resolve(fixturesDir, "parser-temp");
    await mkdir(tempDir, { recursive: true });
    const tempFile = resolve(tempDir, "codeblock-heading.md");
    await writeFile(
      tempFile,
      "# Real Heading\n\n```markdown\n# Fake Heading\n```\n"
    );
    const result = await parseFile(tempFile, "codeblock-heading.md");
    expect(result.headings).toContain("# Real Heading");
    expect(result.headings).not.toContain("# Fake Heading");
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
