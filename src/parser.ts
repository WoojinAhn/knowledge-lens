import { readFile } from "fs/promises";
import matter from "gray-matter";
import type { ParsedFile, ParsedLink } from "./types.js";

interface ContentLine {
  text: string;
  lineNumber: number;
}

function getContentLines(rawContent: string): ContentLine[] {
  const lines = rawContent.split("\n");
  const result: ContentLine[] = [];
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trimStart().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    result.push({ text: line, lineNumber: i + 1 });
  }

  return result;
}

export async function parseFile(
  absolutePath: string,
  relativePath: string
): Promise<ParsedFile> {
  const raw = await readFile(absolutePath, "utf-8");
  const { data: frontmatter, content: body } = matter(raw);

  const contentLines = getContentLines(body);
  const headings = extractHeadings(contentLines);
  const links = extractLinks(contentLines);

  return {
    path: relativePath,
    absolutePath,
    headings,
    links,
    frontmatter: Object.keys(frontmatter).length > 0 ? frontmatter : null,
  };
}

function extractHeadings(lines: ContentLine[]): string[] {
  const headings: string[] = [];

  for (const { text } of lines) {
    const match = text.match(/^(#{1,6})\s+(.+)/);
    if (match) {
      headings.push(text.trim());
    }
  }
  return headings;
}

function isExternalLink(target: string): boolean {
  return /^https?:\/\//.test(target) || target.startsWith("mailto:");
}

function extractLinks(lines: ContentLine[]): ParsedLink[] {
  const links: ParsedLink[] = [];

  for (const { text, lineNumber } of lines) {
    const clean = text.replace(/`[^`]+`/g, "");

    const inlineRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
    let match;
    while ((match = inlineRegex.exec(clean)) !== null) {
      const target = match[2].split("#")[0].trim();
      if (target && !isExternalLink(target)) {
        links.push({ target, line: lineNumber, type: "inline" });
      }
    }

    const refMatch = clean.match(/^\[([^\]]+)\]:\s+(\S+)/);
    if (refMatch) {
      const target = refMatch[2].split("#")[0].trim();
      if (target && !isExternalLink(target)) {
        links.push({ target, line: lineNumber, type: "reference" });
      }
    }
  }

  return links;
}
