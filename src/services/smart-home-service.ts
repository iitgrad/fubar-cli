import type {
  AutomationRule,
  Device,
  DeviceType,
  EventRecord,
  Home,
  HomeOverview,
  OccupancyState,
  Room,
  RoomOverview,
  Sensor,
  SensorType,
} from "../models/types";
import { makeId } from "../utils/id";
import { nowIso } from "../utils/time";
import { AppError } from "../utils/errors";
import type { SmartHomeRepository } from "../storage/repository";

export class SmartHomeService {
  constructor(private readonly repo: SmartHomeRepository) {}

  clear(): void {
    this.repo.clearAll();
  }

  createHome(name: string): Home {
    const home = this.repo.createHome({ id: makeId("home"), name, createdAt: nowIso() });
    this.recordEvent("home.created", `home created: ${home.name}`, { homeId: home.id }, home.id);
    return home;
  }

  listHomes(): Home[] {
    return this.repo.listHomes();
  }

  getHome(ref: string): Home {
    const home = this.repo.getHome(ref);
    if (!home) throw new AppError("home_not_found", `No home matched "${ref}".`, { ref });
    return home;
  }

  resolveHome(ref?: string): Home {
    if (ref) return this.getHome(ref);
    const homes = this.repo.listHomes();
    if (homes.length === 1) return homes[0]!;
    if (homes.length === 0) {
      throw new AppError("no_home", "Create a home first with `fubar home create <name>`.");
    }
    throw new AppError("ambiguous_home", "Multiple homes exist. Pass --home <name-or-id>.", {
      homes: homes.map(({ id, name }) => ({ id, name })),
    });
  }

  removeHome(ref: string): { removed: boolean; ref: string } {
    const home = this.getHome(ref);
    const removed = this.repo.removeHome(ref);
    if (removed) this.recordEvent("home.removed", `home removed: ${home.name}`, { homeId: home.id });
    return { removed, ref };
  }

  createRoom(name: string, options: { home?: string; floor?: string | null }): Room {
    const home = this.resolveHome(options.home);
    const room = this.repo.createRoom({
      id: makeId("room"),
      homeId: home.id,
      name,
      floor: options.floor ?? null,
      occupancyState: "unknown",
      createdAt: nowIso(),
    });
    this.recordEvent("room.created", `room created: ${room.name}`, { roomId: room.id }, home.id, room.id);
    return room;
  }

  listRooms(homeRef?: string): Room[] {
    const home = homeRef ? this.getHome(homeRef) : undefined;
    return this.repo.listRooms(home?.id);
  }

  getRoom(ref: string, homeRef?: string): Room {
    const home = homeRef ? this.getHome(homeRef) : undefined;
    const room = this.repo.getRoom(ref, home?.id);
    if (!room) throw new AppError("room_not_found", `No room matched "${ref}".`, { ref });
    return room;
  }

  removeRoom(ref: string): { removed: boolean; ref: string } {
    const room = this.getRoom(ref);
    const removed = this.repo.removeRoom(ref);
    if (removed) this.recordEvent("room.removed", `room removed: ${room.name}`, { roomId: room.id }, room.homeId);
    return { removed, ref };
  }

  createDevice(roomRef: string, type: DeviceType, name: string): Device {
    const room = this.getRoom(roomRef);
    const device = this.repo.createDevice({
      id: makeId("dev"),
      roomId: room.id,
      name,
      type,
      online: true,
      powerState: "off",
      createdAt: nowIso(),
    });
    this.recordEvent("device.created", `device created: ${device.name}`, { deviceId: device.id }, room.homeId, room.id);
    return device;
  }

  listDevices(roomRef?: string): Device[] {
    const room = roomRef ? this.getRoom(roomRef) : undefined;
    return this.repo.listDevices(room?.id);
  }

  getDevice(ref: string): Device {
    const device = this.repo.getDevice(ref);
    if (!device) throw new AppError("device_not_found", `No device matched "${ref}".`, { ref });
    return device;
  }

  removeDevice(ref: string): { removed: boolean; ref: string } {
    const device = this.getDevice(ref);
    const room = this.getRoom(device.roomId);
    const removed = this.repo.removeDevice(ref);
    if (removed) {
      this.recordEvent("device.removed", `device removed: ${device.name}`, { deviceId: device.id }, room.homeId, room.id);
    }
    return { removed, ref };
  }

  setDevicePower(ref: string, powerState: Device["powerState"]): Device {
    const device = this.getDevice(ref);
    const room = this.getRoom(device.roomId);
    this.repo.setDevicePower(device.id, powerState);
    const updated = { ...device, powerState };
    this.recordEvent(
      `device.${powerState}`,
      `${device.type} turned ${powerState}: ${device.name}`,
      { deviceId: device.id, powerState },
      room.homeId,
      room.id,
    );
    return updated;
  }

  createSensor(roomRef: string, type: SensorType, name: string): Sensor {
    const room = this.getRoom(roomRef);
    const sensor = this.repo.createSensor({
      id: makeId("sensor"),
      roomId: room.id,
      name,
      type,
      lastValue: null,
      lastTriggeredAt: null,
      createdAt: nowIso(),
    });
    this.recordEvent("sensor.created", `sensor created: ${sensor.name}`, { sensorId: sensor.id }, room.homeId, room.id);
    return sensor;
  }

  listSensors(roomRef?: string): Sensor[] {
    const room = roomRef ? this.getRoom(roomRef) : undefined;
    return this.repo.listSensors(room?.id);
  }

  getSensor(ref: string): Sensor {
    const sensor = this.repo.getSensor(ref);
    if (!sensor) throw new AppError("sensor_not_found", `No sensor matched "${ref}".`, { ref });
    return sensor;
  }

  triggerSensor(ref: string, value?: string): Sensor {
    const sensor = this.getSensor(ref);
    const room = this.getRoom(sensor.roomId);
    const triggerValue = value ?? defaultSensorValue(sensor.type);
    const triggeredAt = nowIso();
    this.repo.updateSensorTrigger(sensor.id, triggerValue, triggeredAt);
    const updated = { ...sensor, lastValue: triggerValue, lastTriggeredAt: triggeredAt };
    this.recordEvent(
      `sensor.${sensor.type}`,
      `${sensor.type} detected: ${room.name}`,
      { sensorId: sensor.id, value: triggerValue },
      room.homeId,
      room.id,
    );
    if (sensor.type === "motion") this.setOccupancy(room.id, "occupied");
    return updated;
  }

  getOccupancy(roomRef?: string): Room[] {
    if (roomRef) return [this.getRoom(roomRef)];
    return this.repo.listRooms();
  }

  setOccupancy(roomRef: string, occupancyState: OccupancyState): Room {
    const room = this.getRoom(roomRef);
    this.repo.setRoomOccupancy(room.id, occupancyState);
    const updated = { ...room, occupancyState };
    this.recordEvent(
      "occupancy.changed",
      `occupancy changed: ${room.name} -> ${occupancyState}`,
      { roomId: room.id, occupancyState },
      room.homeId,
      room.id,
    );
    return updated;
  }

  clearOccupancy(roomRef: string): Room {
    return this.setOccupancy(roomRef, "unknown");
  }

  createAutomation(options: {
    name?: string;
    home?: string;
    when?: string;
    room?: string;
    device?: string;
    action?: string;
  }): AutomationRule {
    const home = this.resolveHome(options.home);
    const name = options.name ?? "Turn off devices in vacant rooms";
    const rule = this.repo.createAutomation({
      id: makeId("rule"),
      homeId: home.id,
      name,
      triggerType: options.when ?? "occupancy.vacant",
      triggerRef: options.room ?? null,
      actionType: options.action ?? "device.off",
      actionRef: options.device ?? null,
      enabled: true,
      createdAt: nowIso(),
      lastRunAt: null,
    });
    this.recordEvent("automation.created", `automation created: ${rule.name}`, { ruleId: rule.id }, home.id);
    return rule;
  }

  listAutomations(homeRef?: string): AutomationRule[] {
    const home = homeRef ? this.getHome(homeRef) : undefined;
    return this.repo.listAutomations(home?.id);
  }

  removeAutomation(ref: string): { removed: boolean; ref: string } {
    const rule = this.getAutomation(ref);
    const removed = this.repo.removeAutomation(ref);
    if (removed) this.recordEvent("automation.removed", `automation removed: ${rule.name}`, { ruleId: rule.id }, rule.homeId);
    return { removed, ref };
  }

  getAutomation(ref: string): AutomationRule {
    const rule = this.repo.getAutomation(ref);
    if (!rule) throw new AppError("automation_not_found", `No automation matched "${ref}".`, { ref });
    return rule;
  }

  runAutomation(ref?: string): AutomationRule[] {
    const rules = ref ? [this.getAutomation(ref)] : this.repo.listAutomations();
    const at = nowIso();
    for (const rule of rules) {
      this.repo.markAutomationRun(rule.id, at);
      this.recordEvent("automation.run", `automation run: ${rule.name}`, { ruleId: rule.id }, rule.homeId);
      if (rule.actionType === "device.off" && rule.actionRef) {
        const device = this.repo.getDevice(rule.actionRef);
        if (device) this.repo.setDevicePower(device.id, "off");
      }
    }
    return rules.map((rule) => ({ ...rule, lastRunAt: at }));
  }

  listEvents(options: { limit?: number; type?: string; home?: string; since?: string } = {}): EventRecord[] {
    const home = options.home ? this.getHome(options.home) : undefined;
    return this.repo.listEvents({ limit: options.limit, type: options.type, homeId: home?.id, since: options.since });
  }

  getOverview(homeRef?: string): HomeOverview[] {
    const homes = homeRef ? [this.getHome(homeRef)] : this.repo.listHomes();
    return homes.map((home) => {
      const rooms = this.repo.listRooms(home.id).map<RoomOverview>((room) => ({
        ...room,
        devices: this.repo.listDevices(room.id),
        sensors: this.repo.listSensors(room.id),
        events: this.repo.listEvents({ homeId: home.id, limit: 10 }).filter((event) => event.roomId === room.id),
      }));
      return {
        home,
        rooms,
        automations: this.repo.listAutomations(home.id),
        recentEvents: this.repo.listEvents({ homeId: home.id, limit: 10 }),
      };
    });
  }

  recordEvent(
    type: string,
    message: string,
    metadata: Record<string, unknown>,
    homeId: string | null = null,
    roomId: string | null = null,
  ): EventRecord {
    return this.repo.createEvent({
      id: makeId("evt"),
      homeId,
      roomId,
      type,
      message,
      metadata,
      createdAt: nowIso(),
    });
  }
}

function defaultSensorValue(type: SensorType): string {
  switch (type) {
    case "temperature":
      return "70";
    case "humidity":
      return "42";
    case "door":
    case "window":
      return "open";
    case "motion":
      return "detected";
  }
}
