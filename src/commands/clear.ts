import { Command } from "commander";
import { createService } from "../storage/context";
import { success, writeOutput } from "../utils/output";
import { addExamples, runAction } from "./helpers";

type ClearResult = {
  cleared: true;
};

export function makeClearCommand(): Command {
  const clear = new Command("clear")
    .description("Remove all homes, rooms, devices, sensors, automations, and events.")
    .summary("clear all persisted state")
    .action((command: Command) =>
      runAction(command, () => {
        createService().clear();
        const result: ClearResult = { cleared: true };
        writeOutput(command, result, () => console.log(success("FUBAR database cleared.")));
      }),
    );

  addExamples(clear, ["fubar clear", "fubar clear --json", "FUBAR_DB_PATH=/tmp/fubar-demo.db fubar clear"], [
    "fubar status",
    "fubar home create \"Kevin's House\"",
  ]);

  return clear;
}
