import type { ParsedFile, StructureResult, StructureEntry } from "../types.js";

export function analyzeStructure(files: ParsedFile[]): StructureResult {
  const entries: StructureEntry[] = files.map((file) => ({
    path: file.path,
    internalLinks: file.links.length,
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
    for (let i = 0; i < parts.length - 1; i++) {
      const dirPath = parts.slice(0, i + 1).join("/");
      if (!dirs.has(dirPath)) {
        dirs.add(dirPath);
        const indent = "  ".repeat(i);
        lines.push(`${indent}${parts[i]}/`);
      }
    }
    const indent = "  ".repeat(parts.length - 1);
    lines.push(`${indent}${parts[parts.length - 1]}`);
  }

  return lines.join("\n");
}
