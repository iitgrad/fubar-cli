import { Command } from "commander";
import { createService } from "../storage/context";
import { formatClock } from "../utils/time";
import { dim, heading, makeTable, writeOutput } from "../utils/output";
import { parseLimit } from "../utils/parse";
import { addExamples, runAction } from "./helpers";

export function makeEventsCommand(): Command {
  const events = new Command("events").description("Inspect or stream smart home event history.").summary("inspect events");
  addExamples(events, ["fubar events list", "fubar events list --type device.on --json", "fubar events watch"]);

  addExamples(
    events
      .command("list")
      .description("List recent event history.")
      .option("--limit <n>", "maximum events to return", parseLimit, 50)
      .option("--type <type>", "filter by event type, such as motion.detected or device.on")
      .option("--home <home>", "home id or name")
      .action((options: { limit: number; type?: string; home?: string }, command: Command) =>
        runAction(command, () => {
          const rows = createService().listEvents(options);
          writeOutput(command, rows, () => {
            console.log(heading("Events"));
            console.log(makeTable(["Time", "Type", "Message"], rows.map((item) => [formatClock(item.createdAt), item.type, item.message])));
          });
        }),
      ),
    ["fubar events list", "fubar events list --limit 10", "fubar events list --type occupancy.changed --json"],
  );

  addExamples(
    events
      .command("watch")
      .description("Stream events continuously until interrupted.")
      .option("--interval <ms>", "poll interval in milliseconds", (value) => Math.max(250, Number.parseInt(value, 10)), 1000)
      .action((options: { interval: number }, command: Command) =>
        runAction(command, async () => {
          const service = createService();
          let since = new Date(0).toISOString();
          console.log(dim("Watching events. Press Ctrl+C to stop."));
          for (;;) {
            const rows = service.listEvents({ since, limit: 100 }).reverse();
            for (const event of rows) {
              since = event.createdAt;
              console.log(`[${formatClock(event.createdAt)}] ${event.message}`);
            }
            await Bun.sleep(options.interval);
          }
        }),
      ),
    ["fubar events watch", "fubar events watch --interval 2000"],
  );

  return events;
}
