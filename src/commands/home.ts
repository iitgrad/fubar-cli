import { Command } from "commander";
import { createService } from "../storage/context";
import { dim, heading, makeTable, success, writeOutput } from "../utils/output";
import { addExamples, runAction } from "./helpers";

export function makeHomeCommand(): Command {
  const home = new Command("home")
    .description("Create, list, remove, and inspect smart home environments.")
    .summary("manage homes");

  addExamples(home, ["fubar home create \"Kevin's House\"", "fubar home list --json"]);

  addExamples(
    home
      .command("create")
      .description("Create a smart home environment.")
      .argument("<name>", "home name")
      .action((name: string, command: Command) =>
        runAction(command, () => {
          const service = createService();
          const home = service.createHome(name);
          writeOutput(command, home, () => {
            console.log(success("Home created."));
            console.log(`${heading(home.name)} (${home.id})`);
          });
        }),
      ),
    ["fubar home create \"Kevin's House\"", "fubar status"],
    ["fubar room add <name>", "fubar home list"],
  );

  addExamples(
    home
      .command("list")
      .description("List all known smart homes.")
      .action((command: Command) =>
        runAction(command, () => {
          const homes = createService().listHomes();
          writeOutput(command, homes, () => {
            console.log(heading("Homes"));
            console.log(makeTable(["ID", "Name", "Created"], homes.map((item) => [item.id, item.name, item.createdAt])));
          });
        }),
      ),
    ["fubar home list", "fubar home list --json"],
  );

  addExamples(
    home
      .command("remove")
      .description("Remove a home and all rooms, devices, sensors, automations, and history under it.")
      .argument("<home>", "home id or name")
      .action((ref: string, command: Command) =>
        runAction(command, () => {
          const result = createService().removeHome(ref);
          writeOutput(command, result, () => console.log(success(`Removed home ${ref}.`)));
        }),
      ),
    ["fubar home remove \"Demo House\"", "fubar home remove home_abc123 --json"],
  );

  addExamples(
    home
      .command("status")
      .description("Show a home-level status summary.")
      .argument("[home]", "home id or name")
      .action((ref: string | undefined, command: Command) =>
        runAction(command, () => {
          const overview = createService().getOverview(ref);
          writeOutput(command, overview, () => {
            for (const item of overview) {
              console.log(heading(item.home.name));
              console.log(dim(`${item.rooms.length} rooms, ${item.automations.length} automations, ${item.recentEvents.length} recent events`));
            }
          });
        }),
      ),
    ["fubar home status", "fubar home status \"Kevin's House\" --json"],
    ["fubar status"],
  );

  return home;
}
