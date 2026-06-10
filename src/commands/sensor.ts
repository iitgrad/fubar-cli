import { Command } from "commander";
import { parseSensorType } from "../models/schemas";
import { createService } from "../storage/context";
import { heading, makeTable, success, writeOutput } from "../utils/output";
import { addExamples, runAction } from "./helpers";

export function makeSensorCommand(): Command {
  const sensor = new Command("sensor").description("Manage environmental and contact sensors.").summary("manage sensors");
  addExamples(sensor, ["fubar sensor add kitchen motion kitchen-motion", "fubar sensor trigger kitchen-motion", "fubar sensor list --json"]);

  addExamples(
    sensor
      .command("add")
      .description("Add a sensor to a room.")
      .argument("<room>", "room id or name")
      .argument("<type>", "sensor type: motion, temperature, humidity, door, window")
      .argument("<name>", "stable sensor name")
      .action((room: string, type: string, name: string, command: Command) =>
        runAction(command, () => {
          const created = createService().createSensor(room, parseSensorType(type), name);
          writeOutput(command, created, () => console.log(success(`Added ${created.type} sensor ${created.name}.`)));
        }),
      ),
    ["fubar sensor add kitchen motion kitchen-motion", "fubar sensor add office temperature office-temperature"],
    ["fubar sensor trigger <sensor>", "fubar events list"],
  );

  addExamples(
    sensor
      .command("list")
      .description("List sensors, optionally scoped to a room.")
      .option("--room <room>", "room id or name")
      .action((options: { room?: string }, command: Command) =>
        runAction(command, () => {
          const sensors = createService().listSensors(options.room);
          writeOutput(command, sensors, () => {
            console.log(heading("Sensors"));
            console.log(makeTable(["ID", "Name", "Type", "Last Value", "Last Triggered"], sensors.map((item) => [item.id, item.name, item.type, item.lastValue, item.lastTriggeredAt])));
          });
        }),
      ),
    ["fubar sensor list", "fubar sensor list --room kitchen --jsonl"],
  );

  addExamples(
    sensor
      .command("trigger")
      .description("Trigger a sensor and record an event.")
      .argument("<sensor>", "sensor id or name")
      .argument("[value]", "optional sensor value")
      .action((ref: string, value: string | undefined, command: Command) =>
        runAction(command, () => {
          const updated = createService().triggerSensor(ref, value);
          writeOutput(command, updated, () => console.log(success(`Triggered ${updated.name}.`)));
        }),
      ),
    ["fubar sensor trigger kitchen-motion", "fubar sensor trigger office-temperature 72", "fubar sensor trigger front-door open --json"],
  );

  addExamples(
    sensor
      .command("status")
      .description("Show one sensor's current state.")
      .argument("<sensor>", "sensor id or name")
      .action((ref: string, command: Command) =>
        runAction(command, () => {
          const item = createService().getSensor(ref);
          writeOutput(command, item, () => {
            console.log(heading(item.name));
            console.log(makeTable(["Type", "Last Value", "Last Triggered"], [[item.type, item.lastValue, item.lastTriggeredAt]]));
          });
        }),
      ),
    ["fubar sensor status kitchen-motion", "fubar sensor status kitchen-motion --json"],
  );

  return sensor;
}
