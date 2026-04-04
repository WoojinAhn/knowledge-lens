export interface CLIOptions {
  path: string;
  json: boolean;
  claude: boolean;
  help: boolean;
  version: boolean;
}

export interface ParsedLink {
  target: string;       // raw link target as written in markdown
  line: number;         // line number where link appears
  type: "inline" | "reference";
}

export interface ParsedFile {
  path: string;         // relative path from scan root
  absolutePath: string;
  headings: string[];   // e.g. ["# Title", "## Section"]
  links: ParsedLink[];
  frontmatter: Record<string, unknown> | null;
}

export interface StructureEntry {
  path: string;
  internalLinks: number;
  externalLinks: number;
  headings: number;
  frontmatter: Record<string, unknown> | null;
}

export interface StructureResult {
  totalFiles: number;
  files: StructureEntry[];
  tree: string;
}

export interface LinkEntry {
  source: string;  // "file.md:line"
  target: string;  // link target path
}

export interface ValidLink extends LinkEntry {
  status: "ok";
}

export interface BrokenLink extends LinkEntry {
  reason: string;
}

export interface OrphanFile {
  path: string;
  reason: string;
}

export interface LinksResult {
  valid: ValidLink[];
  broken: BrokenLink[];
  orphans: OrphanFile[];
}

export interface AnalysisResult {
  version: string;
  scannedAt: string;
  root: string;
  options: { claude: boolean };
  structure: StructureResult;
  links: LinksResult;
  summary: {
    totalFiles: number;
    validLinks: number;
    brokenLinks: number;
    orphanFiles: number;
  };
}
