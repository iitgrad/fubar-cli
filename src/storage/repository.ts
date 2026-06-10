import type { Database } from "bun:sqlite";
import type {
  AutomationRule,
  Device,
  EventRecord,
  Home,
  OccupancyState,
  Room,
  Sensor,
} from "../models/types";

type HomeRow = { id: string; name: string; created_at: string };
type RoomRow = {
  id: string;
  home_id: string;
  name: string;
  floor: string | null;
  occupancy_state: OccupancyState;
  created_at: string;
};
type DeviceRow = {
  id: string;
  room_id: string;
  name: string;
  type: Device["type"];
  online: number;
  power_state: Device["powerState"];
  created_at: string;
};
type SensorRow = {
  id: string;
  room_id: string;
  name: string;
  type: Sensor["type"];
  last_value: string | null;
  last_triggered_at: string | null;
  created_at: string;
};
type AutomationRow = {
  id: string;
  home_id: string;
  name: string;
  trigger_type: string;
  trigger_ref: string | null;
  action_type: string;
  action_ref: string | null;
  enabled: number;
  created_at: string;
  last_run_at: string | null;
};
type EventRow = {
  id: string;
  home_id: string | null;
  room_id: string | null;
  type: string;
  message: string;
  metadata: string;
  created_at: string;
};

export class SmartHomeRepository {
  constructor(private readonly db: Database) {}

  clearAll(): void {
    this.db.exec(`
      DELETE FROM events;
      DELETE FROM automations;
      DELETE FROM sensors;
      DELETE FROM devices;
      DELETE FROM rooms;
      DELETE FROM homes;
    `);
  }

  createHome(home: Home): Home {
    this.db
      .query("INSERT INTO homes (id, name, created_at) VALUES (?, ?, ?)")
      .run(home.id, home.name, home.createdAt);
    return home;
  }

  listHomes(): Home[] {
    return this.db.query<HomeRow, []>("SELECT * FROM homes ORDER BY created_at, name").all().map(mapHome);
  }

  getHome(ref: string): Home | null {
    const row = this.db
      .query<HomeRow, [string, string]>("SELECT * FROM homes WHERE id = ?1 OR name = ?2 LIMIT 1")
      .get(ref, ref);
    return row ? mapHome(row) : null;
  }

  removeHome(ref: string): boolean {
    const result = this.db.query("DELETE FROM homes WHERE id = ?1 OR name = ?2").run(ref, ref);
    return result.changes > 0;
  }

  createRoom(room: Room): Room {
    this.db
      .query(
        `INSERT INTO rooms (id, home_id, name, floor, occupancy_state, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(room.id, room.homeId, room.name, room.floor, room.occupancyState, room.createdAt);
    return room;
  }

  listRooms(homeId?: string): Room[] {
    const rows = homeId
      ? this.db
          .query<RoomRow, [string]>("SELECT * FROM rooms WHERE home_id = ? ORDER BY name")
          .all(homeId)
      : this.db.query<RoomRow, []>("SELECT * FROM rooms ORDER BY name").all();
    return rows.map(mapRoom);
  }

  getRoom(ref: string, homeId?: string): Room | null {
    const row = homeId
      ? this.db
          .query<RoomRow, [string, string, string]>(
            "SELECT * FROM rooms WHERE home_id = ?1 AND (id = ?2 OR name = ?3) LIMIT 1",
          )
          .get(homeId, ref, ref)
      : this.db
          .query<RoomRow, [string, string]>("SELECT * FROM rooms WHERE id = ?1 OR name = ?2 LIMIT 1")
          .get(ref, ref);
    return row ? mapRoom(row) : null;
  }

  removeRoom(ref: string): boolean {
    const result = this.db.query("DELETE FROM rooms WHERE id = ?1 OR name = ?2").run(ref, ref);
    return result.changes > 0;
  }

  setRoomOccupancy(roomId: string, occupancyState: OccupancyState): void {
    this.db.query("UPDATE rooms SET occupancy_state = ? WHERE id = ?").run(occupancyState, roomId);
  }

  createDevice(device: Device): Device {
    this.db
      .query(
        `INSERT INTO devices (id, room_id, name, type, online, power_state, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(device.id, device.roomId, device.name, device.type, device.online ? 1 : 0, device.powerState, device.createdAt);
    return device;
  }

  listDevices(roomId?: string): Device[] {
    const rows = roomId
      ? this.db.query<DeviceRow, [string]>("SELECT * FROM devices WHERE room_id = ? ORDER BY name").all(roomId)
      : this.db.query<DeviceRow, []>("SELECT * FROM devices ORDER BY name").all();
    return rows.map(mapDevice);
  }

  getDevice(ref: string): Device | null {
    const row = this.db
      .query<DeviceRow, [string, string]>("SELECT * FROM devices WHERE id = ?1 OR name = ?2 LIMIT 1")
      .get(ref, ref);
    return row ? mapDevice(row) : null;
  }

  removeDevice(ref: string): boolean {
    const result = this.db.query("DELETE FROM devices WHERE id = ?1 OR name = ?2").run(ref, ref);
    return result.changes > 0;
  }

  setDevicePower(deviceId: string, powerState: Device["powerState"]): void {
    this.db.query("UPDATE devices SET power_state = ? WHERE id = ?").run(powerState, deviceId);
  }

  createSensor(sensor: Sensor): Sensor {
    this.db
      .query(
        `INSERT INTO sensors (id, room_id, name, type, last_value, last_triggered_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(sensor.id, sensor.roomId, sensor.name, sensor.type, sensor.lastValue, sensor.lastTriggeredAt, sensor.createdAt);
    return sensor;
  }

  listSensors(roomId?: string): Sensor[] {
    const rows = roomId
      ? this.db.query<SensorRow, [string]>("SELECT * FROM sensors WHERE room_id = ? ORDER BY name").all(roomId)
      : this.db.query<SensorRow, []>("SELECT * FROM sensors ORDER BY name").all();
    return rows.map(mapSensor);
  }

  getSensor(ref: string): Sensor | null {
    const row = this.db
      .query<SensorRow, [string, string]>("SELECT * FROM sensors WHERE id = ?1 OR name = ?2 LIMIT 1")
      .get(ref, ref);
    return row ? mapSensor(row) : null;
  }

  updateSensorTrigger(sensorId: string, value: string, triggeredAt: string): void {
    this.db
      .query("UPDATE sensors SET last_value = ?, last_triggered_at = ? WHERE id = ?")
      .run(value, triggeredAt, sensorId);
  }

  createAutomation(rule: AutomationRule): AutomationRule {
    this.db
      .query(
        `INSERT INTO automations
         (id, home_id, name, trigger_type, trigger_ref, action_type, action_ref, enabled, created_at, last_run_at)
         VALUES
          (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        rule.id,
        rule.homeId,
        rule.name,
        rule.triggerType,
        rule.triggerRef,
        rule.actionType,
        rule.actionRef,
        rule.enabled ? 1 : 0,
        rule.createdAt,
        rule.lastRunAt,
      );
    return rule;
  }

  listAutomations(homeId?: string): AutomationRule[] {
    const rows = homeId
      ? this.db
          .query<AutomationRow, [string]>("SELECT * FROM automations WHERE home_id = ? ORDER BY created_at")
          .all(homeId)
      : this.db.query<AutomationRow, []>("SELECT * FROM automations ORDER BY created_at").all();
    return rows.map(mapAutomation);
  }

  getAutomation(ref: string): AutomationRule | null {
    const row = this.db
      .query<AutomationRow, [string, string]>("SELECT * FROM automations WHERE id = ?1 OR name = ?2 LIMIT 1")
      .get(ref, ref);
    return row ? mapAutomation(row) : null;
  }

  removeAutomation(ref: string): boolean {
    const result = this.db.query("DELETE FROM automations WHERE id = ?1 OR name = ?2").run(ref, ref);
    return result.changes > 0;
  }

  markAutomationRun(ruleId: string, at: string): void {
    this.db.query("UPDATE automations SET last_run_at = ? WHERE id = ?").run(at, ruleId);
  }

  createEvent(event: EventRecord): EventRecord {
    this.db
      .query(
        `INSERT INTO events (id, home_id, room_id, type, message, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(event.id, event.homeId, event.roomId, event.type, event.message, JSON.stringify(event.metadata), event.createdAt);
    return event;
  }

  listEvents(options: { limit?: number; type?: string; homeId?: string; since?: string } = {}): EventRecord[] {
    const clauses: string[] = [];
    const params: Array<string | number> = [];
    if (options.type) {
      clauses.push("type = ?");
      params.push(options.type);
    }
    if (options.homeId) {
      clauses.push("home_id = ?");
      params.push(options.homeId);
    }
    if (options.since) {
      clauses.push("created_at > ?");
      params.push(options.since);
    }
    params.push(options.limit ?? 50);
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    return this.db
      .query<EventRow, Array<string | number>>(`SELECT * FROM events ${where} ORDER BY created_at DESC LIMIT ?`)
      .all(...params)
      .map(mapEvent);
  }
}

function mapHome(row: HomeRow): Home {
  return { id: row.id, name: row.name, createdAt: row.created_at };
}

function mapRoom(row: RoomRow): Room {
  return {
    id: row.id,
    homeId: row.home_id,
    name: row.name,
    floor: row.floor,
    occupancyState: row.occupancy_state,
    createdAt: row.created_at,
  };
}

function mapDevice(row: DeviceRow): Device {
  return {
    id: row.id,
    roomId: row.room_id,
    name: row.name,
    type: row.type,
    online: Boolean(row.online),
    powerState: row.power_state,
    createdAt: row.created_at,
  };
}

function mapSensor(row: SensorRow): Sensor {
  return {
    id: row.id,
    roomId: row.room_id,
    name: row.name,
    type: row.type,
    lastValue: row.last_value,
    lastTriggeredAt: row.last_triggered_at,
    createdAt: row.created_at,
  };
}

function mapAutomation(row: AutomationRow): AutomationRule {
  return {
    id: row.id,
    homeId: row.home_id,
    name: row.name,
    triggerType: row.trigger_type,
    triggerRef: row.trigger_ref,
    actionType: row.action_type,
    actionRef: row.action_ref,
    enabled: Boolean(row.enabled),
    createdAt: row.created_at,
    lastRunAt: row.last_run_at,
  };
}

function mapEvent(row: EventRow): EventRecord {
  return {
    id: row.id,
    homeId: row.home_id,
    roomId: row.room_id,
    type: row.type,
    message: row.message,
    metadata: JSON.parse(row.metadata) as Record<string, unknown>,
    createdAt: row.created_at,
  };
}
