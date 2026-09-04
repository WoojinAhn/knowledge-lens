import type { AnalysisResult } from "./types.js";

export function buildRecommendations(result: AnalysisResult): string[] {
  const brokenLinkActions = result.links.broken.map(
    (link) =>
      `${link.source}: Update or remove the link to ${link.target}, or create the missing file.`
  );
  const orphanActions = result.links.orphans.map(
    (orphan) =>
      `${orphan.path}: Link this file from an index such as README.md, or remove it if obsolete.`
  );

  return [...brokenLinkActions, ...orphanActions];
}
