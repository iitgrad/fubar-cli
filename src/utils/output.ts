import chalk from "chalk";
import Table from "cli-table3";
import type { Command } from "commander";
import type { OutputMode } from "../models/types";
import { AppError, toAppError } from "./errors";

export function getOutputMode(command?: Command | unknown): OutputMode {
  if (!isCommand(command)) return getOutputModeFromArgv();
  const opts = command.optsWithGlobals<{ json?: boolean; jsonl?: boolean }>();
  if (opts.json && opts.jsonl) {
    throw new AppError("invalid_output_mode", "Use either --json or --jsonl, not both.");
  }
  if (opts.json) return "json";
  if (opts.jsonl) return "jsonl";
  return "human";
}

export function writeOutput(command: Command | unknown, data: unknown, human: () => void): void {
  const mode = getOutputMode(command);
  if (mode === "json") {
    console.log(JSON.stringify({ ok: true, data }, null, 2));
    return;
  }
  if (mode === "jsonl") {
    const rows = Array.isArray(data) ? data : [data];
    for (const row of rows) console.log(JSON.stringify(row));
    return;
  }
  human();
}

export function writeError(command: Command | unknown | undefined, error: unknown): void {
  const appError = toAppError(error);
  const mode = command ? safeMode(command) : "human";
  if (mode === "json" || mode === "jsonl") {
    console.error(
      JSON.stringify({
        ok: false,
        error: {
          code: appError.code,
          message: appError.message,
          details: appError.details ?? {},
        },
      }),
    );
    return;
  }
  console.error(chalk.red(`Error: ${appError.message}`));
  if (appError.details && Object.keys(appError.details).length > 0) {
    console.error(chalk.dim(JSON.stringify(appError.details)));
  }
}

export function makeTable(head: string[], rows: Array<Array<string | number | boolean | null | undefined>>): string {
  const table = new Table({ head: head.map((item) => chalk.bold(item)) });
  for (const row of rows) table.push(row.map((value) => formatCell(value)));
  return table.toString();
}

export function heading(text: string): string {
  return chalk.bold.cyan(text);
}

export function success(text: string): string {
  return chalk.green(text);
}

export function dim(text: string): string {
  return chalk.dim(text);
}

function formatCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === "") return chalk.dim("-");
  if (typeof value === "boolean") return value ? "yes" : "no";
  return String(value);
}

function safeMode(command: Command | unknown): OutputMode {
  try {
    return getOutputMode(command);
  } catch {
    return "human";
  }
}

function isCommand(value: unknown): value is Command {
  return Boolean(value && typeof value === "object" && "optsWithGlobals" in value);
}

function getOutputModeFromArgv(): OutputMode {
  const hasJson = process.argv.includes("--json");
  const hasJsonl = process.argv.includes("--jsonl");
  if (hasJson && hasJsonl) {
    throw new AppError("invalid_output_mode", "Use either --json or --jsonl, not both.");
  }
  if (hasJson) return "json";
  if (hasJsonl) return "jsonl";
  return "human";
}
