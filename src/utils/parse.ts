import { AppError } from "./errors";

export function parseLimit(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 1000) {
    throw new AppError("invalid_limit", "Limit must be an integer between 1 and 1000.", { value });
  }
  return parsed;
}
