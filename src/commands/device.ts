import { Command } from "commander";
import { parseDeviceType } from "../models/schemas";
import { createService } from "../storage/context";
import { heading, makeTable, success, writeOutput } from "../utils/output";
import { addExamples, runAction } from "./helpers";

export function makeDeviceCommand(): Command {
  const device = new Command("device").description("Manage controllable smart devices.").summary("manage devices");
  addExamples(device, ["fubar device add kitchen light kitchen-main", "fubar device on kitchen-main", "fubar device list --jsonl"]);

  addExamples(
    device
      .command("add")
      .description("Add a device to a room.")
      .argument("<room>", "room id or name")
      .argument("<type>", "device type: light, thermostat, fan, outlet, blinds")
      .argument("<name>", "stable device name")
      .action((room: string, type: string, name: string, command: Command) =>
        runAction(command, () => {
          const created = createService().createDevice(room, parseDeviceType(type), name);
          writeOutput(command, created, () => console.log(success(`Added ${created.type} ${created.name}.`)));
        }),
      ),
    ["fubar device add kitchen light kitchen-main", "fubar device add office fan office-fan"],
    ["fubar device on <device>", "fubar room status <room>"],
  );

  addExamples(
    device
      .command("list")
      .description("List devices, optionally scoped to a room.")
      .option("--room <room>", "room id or name")
      .action((options: { room?: string }, command: Command) =>
        runAction(command, () => {
          const devices = createService().listDevices(options.room);
          writeOutput(command, devices, () => {
            console.log(heading("Devices"));
            console.log(makeTable(["ID", "Name", "Type", "Online", "Power"], devices.map((item) => [item.id, item.name, item.type, item.online, item.powerState])));
          });
        }),
      ),
    ["fubar device list", "fubar device list --room kitchen --json", "fubar device list --jsonl"],
  );

  addExamples(
    device
      .command("remove")
      .description("Remove a device from the smart home.")
      .argument("<device>", "device id or name")
      .action((ref: string, command: Command) =>
        runAction(command, () => {
          const result = createService().removeDevice(ref);
          writeOutput(command, result, () => console.log(success(`Removed device ${ref}.`)));
        }),
      ),
    ["fubar device remove kitchen-main"],
  );

  for (const state of ["on", "off"] as const) {
    addExamples(
      device
        .command(state)
        .description(`Turn a device ${state}.`)
        .argument("<device>", "device id or name")
        .action((ref: string, command: Command) =>
          runAction(command, () => {
            const updated = createService().setDevicePower(ref, state);
            writeOutput(command, updated, () => console.log(success(`${updated.name} is now ${state}.`)));
          }),
        ),
      [`fubar device ${state} kitchen-main`, `fubar device ${state} dev_abc123 --json`],
    );
  }

  addExamples(
    device
      .command("status")
      .description("Show one device's current state.")
      .argument("<device>", "device id or name")
      .action((ref: string, command: Command) =>
        runAction(command, () => {
          const item = createService().getDevice(ref);
          writeOutput(command, item, () => {
            console.log(heading(item.name));
            console.log(makeTable(["Type", "Online", "Power"], [[item.type, item.online, item.powerState]]));
          });
        }),
      ),
    ["fubar device status kitchen-main", "fubar device status kitchen-main --json"],
  );

  return device;
}
