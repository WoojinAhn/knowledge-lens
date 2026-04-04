import { readdir, readFile } from "fs/promises";
import { join, relative } from "path";
import ignore, { type Ignore } from "ignore";

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

async function loadLensignore(rootPath: string): Promise<Ignore> {
  const ig = ignore();
  try {
    const content = await readFile(join(rootPath, ".lensignore"), "utf-8");
    ig.add(content);
  } catch {
    // no .lensignore file — that's fine
  }
  return ig;
}

export async function scan(
  rootPath: string,
  options: ScanOptions
): Promise<string[]> {
  const ig = await loadLensignore(rootPath);
  const files: string[] = [];
  await walkDir(rootPath, rootPath, files, options, ig);
  return files.sort();
}

async function walkDir(
  currentPath: string,
  rootPath: string,
  files: string[],
  options: ScanOptions,
  ig: Ignore
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

    if (ig.ignores(relativePath)) continue;

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      if (entry.name === ".claude" && !options.claude) continue;
      await walkDir(fullPath, rootPath, files, options, ig);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(relativePath);
    }
  }
}
