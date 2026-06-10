export type OutputMode = "human" | "json" | "jsonl";

export type OccupancyState = "occupied" | "vacant" | "unknown";
export type DeviceType = "light" | "thermostat" | "fan" | "outlet" | "blinds";
export type SensorType = "motion" | "temperature" | "humidity" | "door" | "window";

export interface Home {
  id: string;
  name: string;
  createdAt: string;
}

export interface Room {
  id: string;
  homeId: string;
  name: string;
  floor: string | null;
  occupancyState: OccupancyState;
  createdAt: string;
}

export interface Device {
  id: string;
  roomId: string;
  name: string;
  type: DeviceType;
  online: boolean;
  powerState: "on" | "off";
  createdAt: string;
}

export interface Sensor {
  id: string;
  roomId: string;
  name: string;
  type: SensorType;
  lastValue: string | null;
  lastTriggeredAt: string | null;
  createdAt: string;
}

export interface AutomationRule {
  id: string;
  homeId: string;
  name: string;
  triggerType: string;
  triggerRef: string | null;
  actionType: string;
  actionRef: string | null;
  enabled: boolean;
  createdAt: string;
  lastRunAt: string | null;
}

export interface EventRecord {
  id: string;
  homeId: string | null;
  roomId: string | null;
  type: string;
  message: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface RoomOverview extends Room {
  devices: Device[];
  sensors: Sensor[];
  events: EventRecord[];
}

export interface HomeOverview {
  home: Home;
  rooms: RoomOverview[];
  automations: AutomationRule[];
  recentEvents: EventRecord[];
}
