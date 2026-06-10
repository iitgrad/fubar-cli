import { Command } from "commander";
import { createService } from "../storage/context";
import { heading, makeTable, success, writeOutput } from "../utils/output";
import { addExamples, runAction } from "./helpers";

export function makeAutomationCommand(): Command {
  const automation = new Command("automation").description("Create, list, remove, and run automation rules.").summary("manage automations");
  addExamples(automation, ["fubar automation create", "fubar automation list --json", "fubar automation run"]);

  addExamples(
    automation
      .command("create")
      .description("Create an automation rule.")
      .argument("[name]", "rule name")
      .option("--home <home>", "home id or name")
      .option("--when <trigger>", "trigger name, such as sensor.motion or occupancy.vacant")
      .option("--room <room>", "room id or name associated with the trigger")
      .option("--device <device>", "device id or name associated with the action")
      .option("--action <action>", "action name, such as device.on or device.off")
      .action((name: string | undefined, options: { home?: string; when?: string; room?: string; device?: string; action?: string }, command: Command) =>
        runAction(command, () => {
          const created = createService().createAutomation({ ...options, name });
          writeOutput(command, created, () => console.log(success(`Created automation ${created.name}.`)));
        }),
      ),
    [
      "fubar automation create",
      "fubar automation create \"Turn kitchen lights on\" --when sensor.motion --room kitchen --device kitchen-main --action device.on",
    ],
    ["fubar automation run", "fubar events list --type automation.run"],
  );

  addExamples(
    automation
      .command("list")
      .description("List automation rules.")
      .option("--home <home>", "home id or name")
      .action((options: { home?: string }, command: Command) =>
        runAction(command, () => {
          const rules = createService().listAutomations(options.home);
          writeOutput(command, rules, () => {
            console.log(heading("Automations"));
            console.log(makeTable(["ID", "Name", "Trigger", "Action", "Enabled", "Last Run"], rules.map((item) => [item.id, item.name, item.triggerType, item.actionType, item.enabled, item.lastRunAt])));
          });
        }),
      ),
    ["fubar automation list", "fubar automation list --json"],
  );

  addExamples(
    automation
      .command("remove")
      .description("Remove an automation rule.")
      .argument("<rule>", "automation id or name")
      .action((ref: string, command: Command) =>
        runAction(command, () => {
          const result = createService().removeAutomation(ref);
          writeOutput(command, result, () => console.log(success(`Removed automation ${ref}.`)));
        }),
      ),
    ["fubar automation remove rule_abc123"],
  );

  addExamples(
    automation
      .command("run")
      .description("Run one automation rule, or all rules when no rule is supplied.")
      .argument("[rule]", "automation id or name")
      .action((ref: string | undefined, command: Command) =>
        runAction(command, () => {
          const rules = createService().runAutomation(ref);
          writeOutput(command, rules, () => console.log(success(`Ran ${rules.length} automation rule${rules.length === 1 ? "" : "s"}.`)));
        }),
      ),
    ["fubar automation run", "fubar automation run rule_abc123 --json"],
  );

  return automation;
}
