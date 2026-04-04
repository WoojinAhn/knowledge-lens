import { access } from "fs/promises";
import { resolve, dirname, normalize, basename } from "path";
import type {
  ParsedFile,
  LinksResult,
  ValidLink,
  BrokenLink,
  OrphanFile,
} from "../types.js";

const WELL_KNOWN_FILES = new Set([
  "readme.md",
  "claude.md",
  "changelog.md",
  "contributing.md",
  "license.md",
  "memory.md",
]);

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function analyzeLinks(
  files: ParsedFile[],
  rootPath: string
): Promise<LinksResult> {
  const valid: ValidLink[] = [];
  const broken: BrokenLink[] = [];

  const filePathSet = new Set(files.map((f) => normalize(f.path)));
  const referencedFiles = new Set<string>();

  for (const file of files) {
    const fileDir = dirname(file.path);

    for (const link of file.links) {
      const resolvedRelative = normalize(
        fileDir === "." ? link.target : `${fileDir}/${link.target}`
      );

      const source = `${file.path}:${link.line}`;

      if (
        filePathSet.has(resolvedRelative) ||
        (await fileExists(resolve(rootPath, resolvedRelative)))
      ) {
        valid.push({ source, target: link.target, status: "ok" });
        referencedFiles.add(resolvedRelative);
      } else {
        broken.push({ source, target: link.target, reason: "file not found" });
      }
    }
  }

  const orphans: OrphanFile[] = [];
  for (const file of files) {
    const name = basename(file.path).toLowerCase();

    if (WELL_KNOWN_FILES.has(name)) continue;
    if (referencedFiles.has(normalize(file.path))) continue;

    orphans.push({
      path: file.path,
      reason: "not referenced by any file",
    });
  }

  return { valid, broken, orphans };
}
