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
