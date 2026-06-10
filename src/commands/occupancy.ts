import { Command } from "commander";
import { parseOccupancyState } from "../models/schemas";
import { createService } from "../storage/context";
import { heading, makeTable, success, writeOutput } from "../utils/output";
import { addExamples, runAction } from "./helpers";

export function makeOccupancyCommand(): Command {
  const occupancy = new Command("occupancy").description("Inspect and update room occupancy state.").summary("track occupancy");
  addExamples(occupancy, ["fubar occupancy status", "fubar occupancy set kitchen occupied", "fubar occupancy clear kitchen"]);

  addExamples(
    occupancy
      .command("status")
      .description("Show occupancy for one room or all rooms.")
      .argument("[room]", "room id or name")
      .action((room: string | undefined, command: Command) =>
        runAction(command, () => {
          const rooms = createService().getOccupancy(room);
          writeOutput(command, rooms, () => {
            console.log(heading("Occupancy"));
            console.log(makeTable(["Room", "State"], rooms.map((item) => [item.name, item.occupancyState])));
          });
        }),
      ),
    ["fubar occupancy status", "fubar occupancy status kitchen --json"],
  );

  addExamples(
    occupancy
      .command("set")
      .description("Set a room occupancy state.")
      .argument("<room>", "room id or name")
      .argument("<state>", "occupied, vacant, or unknown")
      .action((room: string, state: string, command: Command) =>
        runAction(command, () => {
          const updated = createService().setOccupancy(room, parseOccupancyState(state));
          writeOutput(command, updated, () => console.log(success(`${updated.name} is now ${updated.occupancyState}.`)));
        }),
      ),
    ["fubar occupancy set kitchen occupied", "fubar occupancy set office vacant --json"],
    ["fubar events list", "fubar automation run"],
  );

  addExamples(
    occupancy
      .command("clear")
      .description("Clear occupancy for a room back to unknown.")
      .argument("<room>", "room id or name")
      .action((room: string, command: Command) =>
        runAction(command, () => {
          const updated = createService().clearOccupancy(room);
          writeOutput(command, updated, () => console.log(success(`${updated.name} occupancy cleared.`)));
        }),
      ),
    ["fubar occupancy clear kitchen"],
  );

  return occupancy;
}
