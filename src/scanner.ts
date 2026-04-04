import { readdir } from "fs/promises";
import { join, relative } from "path";

const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "vendor",
  "tests",
  "test",
  "__tests__",
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
