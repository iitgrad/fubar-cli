import { afterAll, beforeAll, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let tempDir = "";
let dbPath = "";

beforeAll(() => {
  tempDir = mkdtempSync(join(tmpdir(), "fubar-smoke-"));
  dbPath = join(tempDir, "fubar.db");
});

afterAll(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

async function run(args: string[]) {
  const proc = Bun.spawn(["bun", "run", "src/index.ts", ...args], {
    cwd: process.cwd(),
    env: { ...process.env, FUBAR_DB_PATH: dbPath, NO_COLOR: "1" },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { stdout, stderr, exitCode };
}

test("required example flow persists and reports status as JSON", async () => {
  expect((await run(["home", "create", "Kevin's House"])).exitCode).toBe(0);
  expect((await run(["room", "add", "kitchen"])).exitCode).toBe(0);
  expect((await run(["room", "add", "office"])).exitCode).toBe(0);
  expect((await run(["device", "add", "kitchen", "light", "kitchen-main"])).exitCode).toBe(0);
  expect((await run(["device", "add", "office", "fan", "office-fan"])).exitCode).toBe(0);
  expect((await run(["sensor", "add", "kitchen", "motion", "kitchen-motion"])).exitCode).toBe(0);
  expect((await run(["occupancy", "set", "kitchen", "occupied"])).exitCode).toBe(0);
  expect((await run(["device", "on", "kitchen-main"])).exitCode).toBe(0);

  const status = await run(["--json", "status"]);
  expect(status.exitCode).toBe(0);
  const parsed = JSON.parse(status.stdout);
  expect(parsed.ok).toBe(true);
  expect(parsed.data[0].home.name).toBe("Kevin's House");
  expect(parsed.data[0].rooms).toHaveLength(2);
});

test("jsonl list output emits one parseable object per row", async () => {
  const result = await run(["--jsonl", "device", "list"]);
  expect(result.exitCode).toBe(0);
  const rows = result.stdout.trim().split("\n").map((line) => JSON.parse(line));
  expect(rows.map((row) => row.name)).toContain("kitchen-main");
});

test("clear removes all persisted smart home state", async () => {
  expect((await run(["home", "create", "Clear Test Home"])).exitCode).toBe(0);
  const before = await run(["--json", "status"]);
  expect(JSON.parse(before.stdout).data.length).toBeGreaterThan(0);

  expect((await run(["--json", "clear"])).exitCode).toBe(0);

  const status = await run(["--json", "status"]);
  expect(status.exitCode).toBe(0);
  const parsed = JSON.parse(status.stdout);
  expect(parsed.ok).toBe(true);
  expect(parsed.data).toEqual([]);
});

test("help is available at root and leaf commands", async () => {
  const rootHelp = await run(["--help"]);
  expect(rootHelp.stdout).toContain("FUBAR Smart Home CLI");
  expect(rootHelp.stdout).not.toContain("--sample");
  expect((await run(["room", "add", "--help"])).stdout).toContain("Examples:");
  expect((await run(["clear", "--help"])).stdout).toContain("Remove all homes, rooms, devices, sensors, automations, and events.");
});

test("sample home creation is not supported", async () => {
  const help = await run(["home", "create", "--help"]);
  expect(help.stdout).not.toContain("--sample");

  const result = await run(["home", "create", "Sample Removed", "--sample"]);
  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain("unknown option '--sample'");
});
