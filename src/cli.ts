#!/usr/bin/env node

import { resolve } from "path";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { scan } from "./scanner.js";
import { parseFile } from "./parser.js";
import { analyzeStructure } from "./analyzers/structure.js";
import { analyzeLinks } from "./analyzers/links.js";
import { formatJson } from "./formatters/json.js";
import { formatTerminal } from "./formatters/terminal.js";
import type { CLIOptions, AnalysisResult } from "./types.js";

function parseArgs(argv: string[]): CLIOptions {
  const args = argv.slice(2);
  const options: CLIOptions = {
    path: ".",
    json: false,
    claude: false,
    help: false,
    version: false,
  };

  for (const arg of args) {
    switch (arg) {
      case "--json":
        options.json = true;
        break;
      case "--claude":
        options.claude = true;
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      case "--version":
      case "-v":
        options.version = true;
        break;
      default:
        if (!arg.startsWith("-")) {
          options.path = arg;
        } else {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
Usage: lens [path] [options]

Analyze markdown-based knowledge files in a repository.

Arguments:
  path          Directory to scan (default: current directory)

Options:
  --json        Output in JSON format
  --claude      Include .claude/ directory in scan
  -h, --help    Show this help
  -v, --version Show version
`);
}

async function getVersion(): Promise<string> {
  try {
    const pkgPath = new URL("../package.json", import.meta.url);
    const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
    return pkg.version;
  } catch {
    return "unknown";
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv);

  if (options.help) {
    printHelp();
    return;
  }

  if (options.version) {
    console.log(await getVersion());
    return;
  }

  const rootPath = resolve(options.path);

  if (!existsSync(rootPath)) {
    console.error(`Error: path does not exist: ${rootPath}`);
    process.exit(1);
  }

  // Scan
  const filePaths = await scan(rootPath, { claude: options.claude });

  if (filePaths.length === 0) {
    console.log("No markdown files found.");
    return;
  }

  // Parse
  const parsedFiles = await Promise.all(
    filePaths.map((relativePath) =>
      parseFile(resolve(rootPath, relativePath), relativePath)
    )
  );

  // Analyze
  const structure = analyzeStructure(parsedFiles);
  const links = analyzeLinks(parsedFiles, rootPath);

  // Build result
  const result: AnalysisResult = {
    version: await getVersion(),
    scannedAt: new Date().toISOString(),
    root: options.path,
    options: { claude: options.claude },
    structure,
    links,
    summary: {
      totalFiles: structure.totalFiles,
      validLinks: links.valid.length,
      brokenLinks: links.broken.length,
      orphanFiles: links.orphans.length,
    },
  };

  // Format and output
  if (options.json) {
    console.log(formatJson(result));
  } else {
    console.log(formatTerminal(result));
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
