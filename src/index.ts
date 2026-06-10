#!/usr/bin/env bun
import { createProgram } from "./cli/program";

await createProgram().parseAsync(process.argv);
