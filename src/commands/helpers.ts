import { writeError } from "../utils/output";
import type { Command } from "commander";

export function runAction(command: Command | unknown, action: () => Promise<void> | void): Promise<void> {
  return Promise.resolve()
    .then(action)
    .catch((error) => {
      writeError(command, error);
      process.exitCode = 1;
    });
}

export function addExamples(command: Command, examples: string[], related: string[] = []): Command {
  command.addHelpText(
    "after",
    [
      "",
      "Examples:",
      ...examples.map((example) => `  ${example}`),
      related.length ? "" : null,
      related.length ? "Related commands:" : null,
      ...related.map((item) => `  ${item}`),
    ]
      .filter(Boolean)
      .join("\n"),
  );
  return command;
}
