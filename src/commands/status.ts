import { Command } from "commander";
import { createService } from "../storage/context";
import { dim, heading, makeTable, writeOutput } from "../utils/output";
import { addExamples, runAction } from "./helpers";

export function makeStatusCommand(): Command {
  const status = new Command("status")
    .description("Show a full smart home overview grouped by room.")
    .summary("show full system status")
    .option("--home <home>", "home id or name")
    .action((options: { home?: string }, command: Command) =>
      runAction(command, () => {
        const overview = createService().getOverview(options.home);
        writeOutput(command, overview, () => {
          if (overview.length === 0) {
            console.log(dim("No homes yet. Create one with `fubar home create \"My Home\"`."));
            return;
          }
          for (const item of overview) {
            console.log(heading(item.home.name));
            for (const room of item.rooms) {
              console.log(`\n${heading(room.name)} ${dim(`(${room.occupancyState})`)}`);
              console.log(
                makeTable(
                  ["Device", "Type", "Power", "Online"],
                  room.devices.map((device) => [device.name, device.type, device.powerState, device.online]),
                ),
              );
              if (room.sensors.length > 0) {
                console.log(
                  makeTable(
                    ["Sensor", "Type", "Last Value"],
                    room.sensors.map((sensor) => [sensor.name, sensor.type, sensor.lastValue]),
                  ),
                );
              }
            }
            if (item.automations.length > 0) {
              console.log(`\n${heading("Automations")}`);
              console.log(makeTable(["Name", "Trigger", "Action", "Last Run"], item.automations.map((rule) => [rule.name, rule.triggerType, rule.actionType, rule.lastRunAt])));
            }
          }
        });
      }),
    );

  addExamples(status, ["fubar status", "fubar status --home \"Kevin's House\"", "fubar status --json"], [
    "fubar room list",
    "fubar events list",
  ]);
  return status;
}
