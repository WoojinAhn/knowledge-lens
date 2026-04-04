import { existsSync } from "fs";
import { resolve, dirname, normalize } from "path";
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

export function analyzeLinks(
  files: ParsedFile[],
  rootPath: string
): LinksResult {
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

      const resolvedAbsolute = resolve(rootPath, resolvedRelative);
      const source = `${file.path}:${link.line}`;

      if (filePathSet.has(resolvedRelative) || existsSync(resolvedAbsolute)) {
        valid.push({ source, target: link.target, status: "ok" });
        referencedFiles.add(resolvedRelative);
      } else {
        broken.push({ source, target: link.target, reason: "file not found" });
      }
    }
  }

  const orphans: OrphanFile[] = [];
  for (const file of files) {
    const normalized = normalize(file.path);
    const basename = file.path.split("/").pop()?.toLowerCase() ?? "";

    if (WELL_KNOWN_FILES.has(basename)) continue;
    if (referencedFiles.has(normalized)) continue;

    orphans.push({
      path: file.path,
      reason: "not referenced by any file",
    });
  }

  return { valid, broken, orphans };
}
