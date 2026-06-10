import { z } from "zod";
import { AppError } from "../utils/errors";

export const occupancyStateSchema = z.enum(["occupied", "vacant", "unknown"]);
export const deviceTypeSchema = z.enum(["light", "thermostat", "fan", "outlet", "blinds"]);
export const sensorTypeSchema = z.enum(["motion", "temperature", "humidity", "door", "window"]);

export function parseDeviceType(value: string) {
  const parsed = deviceTypeSchema.safeParse(value);
  if (!parsed.success) throw new AppError("invalid_device_type", `Unsupported device type "${value}".`, { allowed: deviceTypeSchema.options });
  return parsed.data;
}

export function parseSensorType(value: string) {
  const parsed = sensorTypeSchema.safeParse(value);
  if (!parsed.success) throw new AppError("invalid_sensor_type", `Unsupported sensor type "${value}".`, { allowed: sensorTypeSchema.options });
  return parsed.data;
}

export function parseOccupancyState(value: string) {
  const parsed = occupancyStateSchema.safeParse(value);
  if (!parsed.success) {
    throw new AppError("invalid_occupancy_state", `Unsupported occupancy state "${value}".`, {
      allowed: occupancyStateSchema.options,
    });
  }
  return parsed.data;
}
