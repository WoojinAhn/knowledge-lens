import chalk from "chalk";
import type { AnalysisResult } from "../types.js";

export function formatTerminal(result: AnalysisResult): string {
  const lines: string[] = [];

  lines.push("");
  lines.push(chalk.bold("Structure Map"));
  lines.push(chalk.dim("-".repeat(40)));

  for (const file of result.structure.files) {
    const meta = `${file.internalLinks} links, ${file.headings} headings`;
    const fm = file.frontmatter
      ? chalk.dim(` [${(file.frontmatter as Record<string, unknown>).type ?? "unknown"}]`)
      : "";
    lines.push(`  ${file.path} ${chalk.dim(`(${meta})`)}${fm}`);
  }

  lines.push("");
  lines.push(chalk.dim("Tree:"));
  for (const treeLine of result.structure.tree.split("\n")) {
    lines.push(`  ${chalk.dim(treeLine)}`);
  }

  lines.push("");
  lines.push(chalk.bold("Link Analysis"));
  lines.push(chalk.dim("-".repeat(40)));

  if (result.links.valid.length > 0) {
    lines.push(
      chalk.green(`  ${result.summary.validLinks} valid links`)
    );
  }

  if (result.links.broken.length > 0) {
    lines.push(
      chalk.red(`  ${result.summary.brokenLinks} broken links`)
    );
    for (const link of result.links.broken) {
      lines.push(chalk.red(`     ${link.source} -> ${link.target} (${link.reason})`));
    }
  }

  if (result.links.orphans.length > 0) {
    lines.push(
      chalk.yellow(`  ${result.summary.orphanFiles} orphan files`)
    );
    for (const orphan of result.links.orphans) {
      lines.push(chalk.yellow(`     ${orphan.path} (${orphan.reason})`));
    }
  }

  if (
    result.links.broken.length === 0 &&
    result.links.orphans.length === 0
  ) {
    lines.push(chalk.green("  All clear - no broken links or orphan files."));
  }

  lines.push("");
  lines.push(chalk.dim(`Scanned ${result.summary.totalFiles} files at ${result.root}`));
  lines.push("");

  return lines.join("\n");
}
