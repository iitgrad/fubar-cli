import { Command } from "commander";
import { createService } from "../storage/context";
import { heading, makeTable, success, writeOutput } from "../utils/output";
import { addExamples, runAction } from "./helpers";

export function makeRoomCommand(): Command {
  const room = new Command("room").description("Manage rooms inside a smart home.").summary("manage rooms");
  addExamples(room, ["fubar room add kitchen", "fubar room list", "fubar room status kitchen --json"]);

  addExamples(
    room
      .command("add")
      .description("Add a room to a home.")
      .argument("<name>", "room name")
      .option("--home <home>", "home id or name; required when multiple homes exist")
      .option("--floor <floor>", "floor label, such as 1, 2, basement, or attic")
      .action((name: string, options: { home?: string; floor?: string }, command: Command) =>
        runAction(command, () => {
          const created = createService().createRoom(name, options);
          writeOutput(command, created, () => console.log(success(`Added room ${created.name}.`)));
        }),
      ),
    ["fubar room add kitchen", "fubar room add office --floor 2", "fubar room add lab --home \"Demo House\""],
    ["fubar device add <room> <type> <name>", "fubar occupancy set <room> <state>"],
  );

  addExamples(
    room
      .command("list")
      .description("List rooms, optionally scoped to a home.")
      .option("--home <home>", "home id or name")
      .action((options: { home?: string }, command: Command) =>
        runAction(command, () => {
          const rooms = createService().listRooms(options.home);
          writeOutput(command, rooms, () => {
            console.log(heading("Rooms"));
            console.log(makeTable(["ID", "Name", "Floor", "Occupancy"], rooms.map((item) => [item.id, item.name, item.floor, item.occupancyState])));
          });
        }),
      ),
    ["fubar room list", "fubar room list --home \"Kevin's House\" --json", "fubar room list --jsonl"],
  );

  addExamples(
    room
      .command("remove")
      .description("Remove a room and its devices, sensors, and room-linked history.")
      .argument("<room>", "room id or name")
      .action((ref: string, command: Command) =>
        runAction(command, () => {
          const result = createService().removeRoom(ref);
          writeOutput(command, result, () => console.log(success(`Removed room ${ref}.`)));
        }),
      ),
    ["fubar room remove kitchen"],
  );

  addExamples(
    room
      .command("status")
      .description("Show room details including devices, sensors, occupancy, and recent events.")
      .argument("<room>", "room id or name")
      .action((ref: string, command: Command) =>
        runAction(command, () => {
          const service = createService();
          const roomStatus = service.getOverview().flatMap((home) => home.rooms).find((item) => item.id === ref || item.name === ref);
          if (!roomStatus) service.getRoom(ref);
          writeOutput(command, roomStatus, () => {
            if (!roomStatus) return;
            console.log(heading(roomStatus.name));
            console.log(makeTable(["Occupancy", "Floor", "Devices", "Sensors"], [[roomStatus.occupancyState, roomStatus.floor, roomStatus.devices.length, roomStatus.sensors.length]]));
          });
        }),
      ),
    ["fubar room status kitchen", "fubar room status office --json"],
  );

  return room;
}
