import { Command } from "commander";
import chalk from "chalk";
import {
  makeAutomationCommand,
  makeClearCommand,
  makeDeviceCommand,
  makeEventsCommand,
  makeHomeCommand,
  makeOccupancyCommand,
  makeRoomCommand,
  makeSensorCommand,
  makeStatusCommand,
} from "../commands";
import { AppError } from "../utils/errors";
import { writeError } from "../utils/output";

export function createProgram(): Command {
  const program = new Command();
  program
    .name("fubar")
    .description("FUBAR Smart Home CLI: a discoverable local smart home simulator for humans and AI agents.")
    .version("1.0.0")
    .showSuggestionAfterError()
    .showHelpAfterError("(run `fubar --help` for discovery)")
    .option("--json", "emit stable JSON for machine consumers")
    .option("--jsonl", "emit newline-delimited JSON for streams and row-oriented lists")
    .option("--verbose", "show additional diagnostic context")
    .configureHelp({
      sortSubcommands: false,
      sortOptions: true,
      showGlobalOptions: true,
    })
    .addHelpText(
      "after",
      [
        "",
        "Discovery:",
        "  fubar --help",
        "  fubar room --help",
        "  fubar room add --help",
        "",
        "Examples:",
        "  fubar home create \"Kevin's House\"",
        "  fubar room list --json",
        "  fubar device list --jsonl",
        "  fubar status",
        "",
        chalk.dim("State is stored in ~/.fubar/fubar.db unless FUBAR_DB_PATH is set."),
      ].join("\n"),
    );

  program.addCommand(makeHomeCommand());
  program.addCommand(makeRoomCommand());
  program.addCommand(makeDeviceCommand());
  program.addCommand(makeSensorCommand());
  program.addCommand(makeAutomationCommand());
  program.addCommand(makeOccupancyCommand());
  program.addCommand(makeEventsCommand());
  program.addCommand(makeStatusCommand());
  program.addCommand(makeClearCommand());

  program.configureOutput({
    writeErr: (text) => process.stderr.write(text),
    outputError: (text, write) => write(chalk.red(text)),
  });

  program.hook("preAction", (thisCommand, actionCommand) => {
    const opts = actionCommand.optsWithGlobals<{ json?: boolean; jsonl?: boolean }>();
    if (opts.json && opts.jsonl) {
      writeError(actionCommand, new AppError("invalid_output_mode", "Use either --json or --jsonl, not both."));
      process.exit(1);
    }
    const verbose = actionCommand.optsWithGlobals<{ verbose?: boolean }>().verbose;
    if (verbose && !opts.json && !opts.jsonl) {
      process.stderr.write(chalk.dim(`Using command: ${thisCommand.name()} ${actionCommand.name()}\n`));
    }
  });

  return program;
}
