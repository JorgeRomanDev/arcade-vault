#!/usr/bin/env node
/**
 * PostToolUse hook: runs Prettier + ESLint --fix on the file Claude just wrote/edited.
 * Receives the tool result JSON from Claude Code via stdin.
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { extname } from "node:path";

const PRETTIER_EXTS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".css",
  ".md",
  ".mdx",
  ".html",
  ".yml",
  ".yaml",
]);

const ESLINT_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

async function main() {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const filePath = payload?.tool_input?.file_path;
  if (!filePath || !existsSync(filePath)) process.exit(0);

  const ext = extname(filePath).toLowerCase();
  if (!PRETTIER_EXTS.has(ext)) process.exit(0);

  const exec = (cmd) => {
    try {
      execSync(cmd, { stdio: "inherit" });
    } catch {
      // Non-zero exit (lint errors that can't be auto-fixed): don't block Claude.
    }
  };

  exec(`npx prettier --write --ignore-unknown "${filePath}"`);

  if (ESLINT_EXTS.has(ext)) {
    exec(`npx eslint --fix "${filePath}"`);
  }
}

main();
